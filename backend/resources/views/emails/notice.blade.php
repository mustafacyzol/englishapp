@extends('emails.layout')
@section('content')
  <h1 style="margin:0 0 14px;font-size:24px;line-height:30px;">{{ $title }}</h1>
  @foreach($lines as $line)
    <p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#3B3F5C;">{{ $line }}</p>
  @endforeach
  @if($ctaUrl)
    <p style="margin:24px 0 0;"><a href="{{ $ctaUrl }}" style="display:inline-block;background:#FF5A36;color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border:2px solid #1B1F3B;border-radius:14px;box-shadow:3px 3px 0 #1B1F3B;">{{ $ctaLabel }}</a></p>
  @endif
@endsection
