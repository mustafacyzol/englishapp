#!/usr/bin/env bash
# DilGO kurulum betiği: gereksinimler, .env, veritabanı (migrate + seed ya da hazır SQL),
# storage bağlantısı, önbellekler, yönetici hesabı ve web derlemesi.
# Her adım tekrar çalıştırılabilir; mevcut veriyi silmez.
# Kullanım: ./scripts/install.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/backend"
say() { printf '\n\033[1;31m▸\033[0m %s\n' "$1"; }
ask() { local q="$1" d="${2:-}" a; read -r -p "$q${d:+ [$d]}: " a; echo "${a:-$d}"; }
secret() { local q="$1" a; read -r -s -p "$q: " a; echo; echo "$a"; }
setenv() { # setenv KEY VALUE → write or replace a line in backend/.env
  local k="$1" v="$2"
  if grep -q "^$k=" "$API/.env"; then
    php -r '$f=$argv[1];$k=$argv[2];$v=$argv[3];$s=file_get_contents($f);$v=preg_match("/[\s#\"]/",$v)?"\"".addcslashes($v,"\"")."\"":$v;file_put_contents($f,preg_replace("/^".preg_quote($k,"/")."=.*$/m",$k."=".str_replace("$","\\$",$v),$s));' "$API/.env" "$k" "$v"
  else echo "$k=$v" >> "$API/.env"; fi
}

say "Gereksinimler kontrol ediliyor"
command -v php >/dev/null || { echo "PHP bulunamadı (8.2+ gerekli)"; exit 1; }
php -r 'exit(version_compare(PHP_VERSION, "8.2.0", ">=") ? 0 : 1);' || { echo "PHP 8.2 veya üzeri gerekli (şu an $(php -r 'echo PHP_VERSION;'))"; exit 1; }
for ext in pdo_mysql mbstring intl fileinfo openssl curl; do php -m | grep -qi "^$ext$" || echo "  uyarı: PHP eklentisi eksik: $ext"; done
COMPOSER="$(command -v composer2 || command -v composer || true)"
[ -n "$COMPOSER" ] || { echo "Composer bulunamadı"; exit 1; }
echo "  PHP $(php -r 'echo PHP_VERSION;') · $($COMPOSER --version 2>/dev/null | head -1)"

say "Bağımlılıklar kuruluyor"
(cd "$API" && $COMPOSER install --no-dev --optimize-autoloader --no-interaction)

say ".env hazırlanıyor"
if [ ! -f "$API/.env" ]; then cp "$API/.env.example" "$API/.env"; echo "  .env oluşturuldu"; fi
grep -q "^APP_KEY=base64" "$API/.env" || (cd "$API" && php artisan key:generate --force)
ENVIRONMENT="$(ask 'Ortam (production/local)' production)"
setenv APP_ENV "$ENVIRONMENT"
[ "$ENVIRONMENT" = production ] && setenv APP_DEBUG false || setenv APP_DEBUG true
setenv APP_URL "$(ask 'API adresi (APP_URL)' 'https://api.dilgo.app')"
FRONT="$(ask 'Web uygulaması adresi (FRONTEND_URL)' 'https://dilgo.app')"
setenv FRONTEND_URL "$FRONT"
setenv CORS_ALLOWED_ORIGINS "$FRONT,capacitor://localhost,https://localhost"

say "Veritabanı bağlantısı"
DBH="$(ask 'MySQL sunucusu' localhost)"; DBP="$(ask 'Port' 3306)"; DBN="$(ask 'Veritabanı adı' dilgo)"; DBU="$(ask 'Kullanıcı' dilgo)"; DBW="$(secret 'Şifre')"
setenv DB_CONNECTION mysql; setenv DB_HOST "$DBH"; setenv DB_PORT "$DBP"; setenv DB_DATABASE "$DBN"; setenv DB_USERNAME "$DBU"; setenv DB_PASSWORD "$DBW"
(cd "$API" && php artisan config:clear >/dev/null && php artisan db:show >/dev/null 2>&1) && echo "  bağlantı başarılı" || { echo "  Veritabanına bağlanılamadı. Bilgileri kontrol edip tekrar çalıştırın."; exit 1; }

say "Tablolar ve başlangıç içerikleri"
HAS="$(cd "$API" && php artisan migrate:status 2>/dev/null | grep -c ' Ran' || true)"
if [ "${HAS:-0}" -gt 0 ]; then
  echo "  Veritabanı zaten kurulu, yalnızca yeni değişiklikler uygulanıyor"
  (cd "$API" && php artisan migrate --force)
else
  WAY="$(ask 'Kurulum yolu: 1) migrate + seed (önerilen)  2) hazır SQL dosyasını içe aktar' 1)"
  if [ "$WAY" = 2 ]; then
    command -v mysql >/dev/null || { echo "  mysql istemcisi yok; dosyayı phpMyAdmin ile içe aktarın: backend/database/sql/dilgo_install.sql"; exit 1; }
    MYSQL_PWD="$DBW" mysql -h "$DBH" -P "$DBP" -u "$DBU" "$DBN" < "$API/database/sql/dilgo_install.sql"
    (cd "$API" && php artisan migrate --force)
  else
    (cd "$API" && php artisan migrate --force && php artisan db:seed --force)
  fi
fi

say "Dosya bağlantısı, izinler ve önbellekler"
(cd "$API" && php artisan storage:link 2>/dev/null || true)
chmod -R 775 "$API/storage" "$API/bootstrap/cache"
(cd "$API" && php artisan optimize:clear >/dev/null && php artisan config:cache && php artisan route:cache && php artisan view:cache)

if [ "$(ask 'Yönetici hesabı oluşturulsun mu? (e/h)' e)" = e ]; then
  EM="$(ask 'Yönetici e-postası')"; NM="$(ask 'Ad soyad' 'Yönetici')"
  (cd "$API" && php artisan dilgo:admin "$EM" --create --name="$NM" --role=super_admin)
fi

if command -v npm >/dev/null && [ "$(ask 'Web uygulaması derlensin mi? (e/h)' e)" = e ]; then
  say "Web uygulaması derleniyor"
  API_URL="$(grep '^APP_URL=' "$API/.env" | cut -d= -f2- | tr -d '"')/api"
  (cd "$ROOT/frontend" && npm ci && VITE_API_URL="$API_URL" VITE_SITE_URL="$FRONT" npm run build)
  echo "  Çıktı: frontend/dist → web sitenizin kök klasörüne (public_html) yükleyin"
fi

say "Tamam"
cat <<TXT
  Son adımlar:
  • Cron (her dakika):  * * * * * php $API/artisan schedule:run >> /dev/null 2>&1
  • SMTP, ödeme ve AI anahtarları için backend/.env dosyasını tamamlayın, sonra: php artisan config:cache
  • Ayrıntılar: docs/KURULUM.md
TXT
