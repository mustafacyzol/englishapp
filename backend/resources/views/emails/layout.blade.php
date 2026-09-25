<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ config('dilgo.brand.name') }}</title>
</head>
<body style="margin:0;padding:0;background:#F6F1E7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1B1F3B;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1E7;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:0 4px 18px;">
      <span style="display:inline-block;background:#1B1F3B;color:#F6F1E7;font-weight:800;font-size:20px;letter-spacing:-0.5px;padding:8px 14px;border-radius:12px;">Dil<span style="color:#FF5A36;">GO</span></span>
      <span style="font-size:12px;color:#6B6A7A;margin-left:8px;">{{ config('dilgo.brand.school') }}</span>
    </td></tr>
    <tr><td style="background:#FFFDF8;border:2px solid #1B1F3B;border-radius:20px;box-shadow:6px 6px 0 #1B1F3B;padding:32px 28px;">
      @yield('content')
    </td></tr>
    <tr><td style="padding:20px 4px;font-size:12px;line-height:18px;color:#6B6A7A;">
      Bu e-posta {{ config('dilgo.brand.name') }} hesabınla ilgili olduğu için gönderildi.<br>
      Destek: <a href="mailto:{{ config('dilgo.brand.support_email') }}" style="color:#1B1F3B;">{{ config('dilgo.brand.support_email') }}</a> · © {{ date('Y') }} {{ config('dilgo.brand.school') }}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
