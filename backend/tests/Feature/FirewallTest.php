<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class FirewallTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_scanner_paths_and_attack_patterns_are_refused(): void
    {
        $this->get('/.env')->assertNotFound();
        $this->get('/wp-login.php')->assertNotFound();
        $this->get('/backup.sql')->assertNotFound();
        $this->getJson('/api/v1/blog?q=1%27%20OR%201%3D1')->assertForbidden();
        $this->getJson('/api/v1/blog?q=x%20UNION%20SELECT%20password%20FROM%20users')->assertForbidden();
        $this->getJson('/api/v1/blog?file=../../etc/passwd')->assertForbidden();
        $this->getJson('/api/v1/blog?q=%3Cscript%3Ealert(1)%3C/script%3E')->assertForbidden();
        $this->getJson('/api/v1/blog?x=${jndi:ldap://a}')->assertForbidden();
        $this->withHeaders(['User-Agent' => 'sqlmap/1.7'])->getJson('/api/v1/config')->assertForbidden();
    }

    public function test_normal_traffic_passes_and_bodies_are_not_pattern_matched(): void
    {
        $this->getJson('/api/v1/config')->assertOk();
        $this->getJson('/api/v1/blog?q=how%20to%20select%20the%20right%20course')->assertOk();
        // free text in a body can look like anything; it is validated, not pattern-matched
        $this->postJson('/api/v1/contact', ['name' => 'Ece', 'email' => 'ece@example.com', 'topic' => 'general', 'kvkk' => true, 'message' => "I typed ' or 1=1 and <script> in my essay, is that ok?"])
            ->assertSuccessful();
    }

    public function test_repeated_hits_ban_the_ip(): void
    {
        Cache::flush();
        config(['dilgo.waf.strikes' => 3]);
        foreach (range(1, 3) as $i) {
            $this->get('/.git/config');
        }
        $this->getJson('/api/v1/config')->assertForbidden();
    }

    public function test_oversized_bodies_are_refused(): void
    {
        config(['dilgo.waf.max_body_kb' => 1]);
        $this->call('POST', '/api/v1/contact', [], [], [], ['CONTENT_LENGTH' => 4096, 'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], str_repeat('a', 4096))
            ->assertStatus(413);
    }
}
