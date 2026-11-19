<?php

namespace App\Enums;

enum CommunityReactionType: string
{
    case Like = 'like';
    case Bookmark = 'bookmark';
}
