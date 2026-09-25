<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Plan;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class BillingController extends Controller
{
    public function __construct(private readonly CheckoutService $checkout) {}

    public function plans(): JsonResponse
    {
        return response()->json(['data' => Plan::query()->where('is_active', true)->orderBy('position')->get()]);
    }

    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate(['plan_id' => ['required', 'exists:plans,id'], 'coupon' => ['nullable', 'string', 'max:40']]);
        $plan = Plan::query()->where('is_active', true)->findOrFail($data['plan_id']);
        $quote = $this->checkout->quote($request->user(), $plan, $data['coupon'] ?? null);

        return response()->json([
            'amount' => $quote['amount'],
            'discount' => $quote['discount'],
            'total' => $quote['total'],
            'currency' => $quote['currency'],
            'coupon' => $quote['coupon']?->only(['code', 'type', 'value', 'description']),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate(['plan_id' => ['required', 'exists:plans,id'], 'coupon' => ['nullable', 'string', 'max:40']]);
        $plan = Plan::query()->where('is_active', true)->findOrFail($data['plan_id']);

        try {
            $result = $this->checkout->start($request->user(), $plan, $data['coupon'] ?? null);
        } catch (\RuntimeException $e) {
            Log::error('Checkout start failed', ['error' => $e->getMessage()]);
            abort(502, 'Ödeme sayfası açılamadı. Lütfen biraz sonra tekrar dene.');
        }

        return response()->json([
            'order' => $result['order']->only(['uuid', 'status', 'total', 'currency']),
            'checkout' => $result['checkout'] ? array_intersect_key($result['checkout'], array_flip(['payment_page_url', 'checkout_form_content'])) : null,
        ], 201);
    }

    public function order(Request $request, string $uuid): JsonResponse
    {
        $order = Order::query()->where('uuid', $uuid)->where('user_id', $request->user()->id)->with('plan:id,name,duration_days')->firstOrFail();

        return response()->json(['order' => $order]);
    }

    public function orders(Request $request): JsonResponse
    {
        return response()->json([
            'orders' => $request->user()->orders()->with('plan:id,name')->latest()->limit(50)->get(),
            'subscriptions' => $request->user()->subscriptions()->with('plan:id,name')->latest()->limit(50)->get(),
        ]);
    }

    /** iyzico posts the token here after the hosted form; we verify server-to-server. */
    public function iyzicoCallback(Request $request): RedirectResponse
    {
        $token = (string) $request->input('token');
        $order = Order::query()->where('gateway', 'iyzico')->where('gateway_token', $token)->first();
        $front = config('dilgo.brand.frontend_url');

        if (! $order) {
            return redirect()->away($front.'/premium/result?status=failed');
        }

        try {
            $order = $this->checkout->confirm($order, $token);
        } catch (Throwable $e) {
            Log::error('iyzico confirm failed', ['order' => $order->uuid, 'error' => $e->getMessage()]);
        }

        return redirect()->away($front.'/premium/result?order='.$order->uuid.'&status='.$order->status);
    }

    /** Development-only simulated payment page. */
    public function fakePay(Request $request, string $uuid): RedirectResponse
    {
        abort_if(app()->isProduction(), 404);
        $order = Order::query()->where('uuid', $uuid)->where('gateway', 'fake')->firstOrFail();
        $order = $this->checkout->confirm($order, (string) $request->query('token'));

        return redirect()->away(config('dilgo.brand.frontend_url').'/premium/result?order='.$order->uuid.'&status='.$order->status);
    }
}
