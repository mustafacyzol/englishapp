<?php

use Illuminate\Support\Facades\Route;

// The API is headless; the React app is served separately (public_html).
Route::get('/', fn () => response()->json(['name' => config('dilgo.brand.name').' API', 'status' => 'ok']));
