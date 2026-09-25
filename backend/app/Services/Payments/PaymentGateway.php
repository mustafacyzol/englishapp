<?php

namespace App\Services\Payments;

use App\Models\Order;

interface PaymentGateway
{
    public function name(): string;

    /**
     * Start a hosted checkout.
     *
     * @return array{token:string, payment_page_url?:string, checkout_form_content?:string}
     */
    public function initialize(Order $order): array;

    /**
     * Ask the provider for the final state of a checkout token.
     *
     * @return array{paid:bool, reference?:string, raw?:array}
     */
    public function retrieve(Order $order, string $token): array;
}
