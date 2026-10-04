<?php

use App\Models\BlogPost;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

// The API is headless; the React app is served separately (public_html).
Route::redirect('/', '/up');

/*
| Sitemap for search engines: the public pages of the site plus every published
| blog post, with their last change. Cached for an hour.
*/
Route::get('sitemap.xml', function () {
    $xml = Cache::remember('sitemap.xml', 3600, function () {
        $base = rtrim((string) config('dilgo.brand.frontend_url'), '/');
        $urls = collect(['/' => '1.0', '/okullar' => '0.8', '/maarif' => '0.8', '/yardim' => '0.6', '/about' => '0.6', '/blog' => '0.8', '/placement' => '0.7', '/register' => '0.7', '/contact' => '0.5', '/terms' => '0.2', '/privacy' => '0.2', '/cookies' => '0.2', '/distance-sales' => '0.2', '/refund' => '0.2'])
            ->map(fn ($p, $path) => ['loc' => $base.$path, 'priority' => $p, 'lastmod' => now()->toDateString()]);
        BlogPost::query()->where('is_published', true)->where('published_at', '<=', now())->latest('published_at')->limit(5000)
            ->get(['slug', 'updated_at'])
            ->each(fn ($b) => $urls->push(['loc' => $base.'/blog/'.rawurlencode($b->slug), 'priority' => '0.6', 'lastmod' => $b->updated_at?->toDateString()]));

        $rows = $urls->values()->map(fn ($u) => '  <url><loc>'.e($u['loc']).'</loc><lastmod>'.$u['lastmod'].'</lastmod><priority>'.$u['priority'].'</priority></url>')->implode("\n");

        return '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n".$rows."\n</urlset>\n";
    });

    return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
});
