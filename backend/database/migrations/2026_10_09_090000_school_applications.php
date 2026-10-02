<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Applications sent from the "Okullar için" page; the sales team follows them up in the admin panel. */
    public function up(): void
    {
        Schema::create('school_applications', function (Blueprint $t) {
            $t->id();
            $t->string('school_name', 160);
            $t->string('city', 60);
            $t->string('district', 60)->nullable();
            $t->string('school_type', 20); // ilkokul | ortaokul | lise | kurs | diger
            $t->unsignedInteger('students');
            $t->json('grades')->nullable();
            $t->string('contact_name', 80);
            $t->string('contact_role', 20); // mudur | mudur_yrd | ogretmen | diger
            $t->string('email', 190);
            $t->string('phone', 30);
            $t->json('interests')->nullable(); // lgs, ydt, konusma, odev, rapor
            $t->text('message')->nullable();
            $t->string('status', 20)->default('new'); // new | contacted | demo | won | lost
            $t->text('admin_note')->nullable();
            $t->string('ip', 45)->nullable();
            $t->timestamps();
            $t->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_applications');
    }
};
