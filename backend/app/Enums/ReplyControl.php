<?php

namespace App\Enums;

enum ReplyControl: string
{
    case Everyone = 'everyone';
    case Followers = 'followers';
    case Following = 'following';
    case MentionedOnly = 'mentioned_only';
    case Locked = 'locked';
}
