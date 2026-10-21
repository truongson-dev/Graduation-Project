<?php

namespace App\Http\Resources;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;

        $roles = [];

        foreach ($user->getRoleNames() as $roleName) {
            $roles[] = (string) $roleName;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $this->toIso8601($user->getAttribute('email_verified_at')),
            'avatar_url' => $user->avatar_url,
            'roles' => $roles,
            'created_at' => $this->toIso8601($user->getAttribute('created_at')),
        ];
    }

    /**
     * Format a date attribute as an ISO 8601 string.
     */
    private function toIso8601(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format(DateTimeInterface::ATOM);
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}
