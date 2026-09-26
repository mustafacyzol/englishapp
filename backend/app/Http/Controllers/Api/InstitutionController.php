<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Presenters\UserPresenter;
use App\Models\Institution;
use App\Models\InstitutionMember;
use App\Services\InstitutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The institution panel (/kurum) for school and company managers, plus the
 * learner-side join flows (invite link or join code).
 */
class InstitutionController extends Controller
{
    public function __construct(private readonly InstitutionService $service) {}

    /** Public: what an invite link points to, so the landing screen can greet the learner. */
    public function invitation(string $token): JsonResponse
    {
        $m = InstitutionMember::query()->where('invite_token', $token)->where('status', 'invited')->with('institution')->first();
        abort_unless($m && $m->institution?->isCurrent(), 404, 'Davet bulunamadı ya da süresi doldu.');

        return response()->json(['institution' => $m->institution->only(['name', 'type', 'city']), 'email' => $m->email, 'name' => $m->name, 'role' => $m->role]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $m = $this->service->acceptToken($request->user(), $token);
        abort_unless($m, 404, 'Davet bulunamadı ya da süresi doldu.');

        return response()->json(['ok' => true, 'user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function join(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:12']]);
        $this->service->joinByCode($request->user(), $data['code']);

        return response()->json(['ok' => true, 'user' => UserPresenter::me($request->user()->fresh())]);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->service->report($this->managed($request)));
    }

    public function invite(Request $request): JsonResponse
    {
        $inst = $this->managed($request);
        $data = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.email' => ['required', 'string', 'max:190'],
            'rows.*.name' => ['nullable', 'string', 'max:80'],
            'rows.*.class_name' => ['nullable', 'string', 'max:60'],
        ]);

        return response()->json($this->service->invite($inst, $data['rows'], 'student', $request->user()));
    }

    public function removeMember(Request $request, InstitutionMember $member): JsonResponse
    {
        $inst = $this->managed($request);
        abort_unless($member->institution_id === $inst->id && $member->role === 'student', 404);
        $this->service->remove($member);

        return response()->json(['ok' => true]);
    }

    private function managed(Request $request): Institution
    {
        $user = $request->user();
        $m = InstitutionMember::query()->where('user_id', $user->id)->where('role', 'manager')->where('status', 'active')->with('institution')->first();
        abort_unless($m?->institution, 403, 'Bu sayfa kurum yöneticilerine özel.');

        return $m->institution;
    }
}
