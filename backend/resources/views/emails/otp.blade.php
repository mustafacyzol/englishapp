@extends('emails.layout')
@section('content')
  <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#FF5A36;">Güvenlik kodu</p>
  <h1 style="margin:0 0 12px;font-size:24px;line-height:30px;">{{ $title }}</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:23px;color:#3B3F5C;">@if($name)Merhaba {{ $name }}, @endif{{ $body }}</p>
  <div style="text-align:center;margin:0 0 22px;">
    <span style="display:inline-block;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;background:#FFE7A3;border:2px solid #1B1F3B;border-radius:14px;padding:14px 22px 14px 32px;">{{ $code }}</span>
  </div>
  <p style="margin:0;font-size:13px;color:#6B6A7A;">Kod {{ $ttl }} dakika geçerlidir. Kodu kimseyle paylaşma — ekibimiz asla senden kod istemez.</p>
@endsection
