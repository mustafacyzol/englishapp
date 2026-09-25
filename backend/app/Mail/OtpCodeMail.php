<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    private const COPY = [
        'verify_email' => ['E-posta adresini doğrula', 'Hesabını aktifleştirmek için aşağıdaki kodu uygulamaya gir.'],
        'reset_password' => ['Şifre sıfırlama kodun', 'Şifreni sıfırlamak için bu kodu kullan. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.'],
        'admin_login' => ['Yönetici giriş kodu', 'Yönetim paneline giriş için tek kullanımlık kodun. Bu girişi sen yapmadıysan hemen şifreni değiştir.'],
        'delete_account' => ['Hesap silme onayı', 'Hesabını kalıcı olarak silmek için bu kodu gir. Bu işlem geri alınamaz.'],
    ];

    public function __construct(public string $code, public string $purpose, public ?string $name = null) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->code.' · '.self::COPY[$this->purpose][0].' — '.config('dilgo.brand.name'));
    }

    public function content(): Content
    {
        [$title, $body] = self::COPY[$this->purpose];

        return new Content(view: 'emails.otp', with: [
            'title' => $title,
            'body' => $body,
            'code' => $this->code,
            'name' => $this->name,
            'ttl' => config('dilgo.otp.ttl_minutes'),
        ]);
    }
}
