<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function staff(string $role, ?array $perms = null): User
    {
        $u = User::factory()->create(['role' => $role, 'email_verified_at' => now()]);
        $u->permissions = $perms;
        $u->save();
        $this->app['auth']->forgetGuards();
        $this->withToken($u->createToken('admin-panel', ['user', 'admin'])->plainTextToken);

        return $u;
    }

    public function test_permissions_gate_each_area(): void
    {
        $this->staff('editor');
        $this->getJson('/api/v1/admin/blog-posts')->assertOk();
        $this->getJson('/api/v1/admin/stories')->assertOk();
        $this->getJson('/api/v1/admin/orders')->assertForbidden();
        $this->getJson('/api/v1/admin/revenue')->assertForbidden();
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/plans')->assertForbidden();

        // A custom list replaces the role defaults.
        $this->staff('editor', ['sales']);
        $this->getJson('/api/v1/admin/revenue')->assertOk();
        $this->getJson('/api/v1/admin/blog-posts')->assertForbidden();
    }

    public function test_super_admin_creates_staff_with_permissions_admin_cannot(): void
    {
        $this->staff('admin');
        $this->postJson('/api/v1/admin/users', ['name' => 'Ayşe', 'email' => 'ayse@example.com', 'role' => 'editor'])->assertForbidden();
        $this->postJson('/api/v1/admin/users', ['name' => 'Ali', 'email' => 'ali@example.com', 'premium_days' => 30, 'verify_email' => true])
            ->assertCreated()->assertJsonPath('user.role', 'user');
        $this->assertTrue(User::query()->where('email', 'ali@example.com')->first()->isPremium());

        $this->staff('super_admin');
        $this->postJson('/api/v1/admin/users', ['name' => 'Ayşe', 'email' => 'ayse@example.com', 'role' => 'editor', 'permissions' => ['blog', 'marketing']])
            ->assertCreated()->assertJsonPath('user.permissions', ['blog', 'marketing']);
        $ayse = User::query()->where('email', 'ayse@example.com')->first();
        $this->patchJson("/api/v1/admin/users/{$ayse->id}", ['permissions' => null])->assertOk()->assertJsonPath('user.permissions', ['content', 'blog']);
        $this->getJson('/api/v1/admin/staff')->assertOk()->assertJsonFragment(['email' => 'ayse@example.com']);
    }

    public function test_support_cannot_edit_other_staff(): void
    {
        $editor = User::factory()->create(['role' => 'editor']);
        $this->staff('support');
        $this->patchJson("/api/v1/admin/users/{$editor->id}", ['is_banned' => true])->assertForbidden();
    }

    public function test_revenue_reports_gross_refunds_and_net(): void
    {
        $plan = Plan::query()->first();
        $buyer = User::factory()->create();
        foreach ([['paid', 100], ['paid', 50], ['refunded', 30], ['pending', 999]] as [$status, $total]) {
            Order::query()->create(['uuid' => (string) \Illuminate\Support\Str::uuid(), 'user_id' => $buyer->id, 'plan_id' => $plan->id, 'amount' => $total, 'total' => $total, 'status' => $status, 'gateway' => 'fake', 'paid_at' => $status === 'pending' ? null : now()]);
        }
        $this->staff('admin');
        $this->getJson('/api/v1/admin/revenue?days=7')->assertOk()
            ->assertJsonPath('periods.today.gross', 180)
            ->assertJsonPath('periods.today.refunded', 30)
            ->assertJsonPath('periods.today.net', 150)
            ->assertJsonPath('periods.all.orders', 3);
        $this->getJson('/api/v1/admin/subscribers')->assertOk()->assertJsonStructure(['data', 'counts' => ['active', 'expiring']]);
    }

    public function test_hostile_query_input_is_harmless(): void
    {
        // the firewall would refuse this first; switch it off to prove the app layer is safe on its own
        config(['dilgo.waf.enabled' => false]);
        $this->staff('admin');
        $this->getJson("/api/v1/admin/users?q=' OR 1=1 --")->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/v1/admin/stories?q[]=x&is_published[]=1&per_page=-5')->assertOk();
        $this->getJson('/api/v1/admin/stories?sort=password')->assertOk();
    }

    public function test_sitemap_lists_published_posts(): void
    {
        $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8')->assertSee('<urlset', false)->assertSee('/blog/', false);
    }
}
