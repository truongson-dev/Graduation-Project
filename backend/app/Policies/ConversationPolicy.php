<?php

namespace App\Policies;

use App\Models\User;
use Laravel\Ai\Models\Conversation;

class ConversationPolicy
{
    /**
     * Determine whether the user owns the AI conversation.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return $user->conversations()->whereKey($conversation->getKey())->exists();
    }
}
