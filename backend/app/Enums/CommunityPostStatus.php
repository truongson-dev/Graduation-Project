<?php

namespace App\Enums;

enum CommunityPostStatus: string
{
    case Published = 'published';
    case Archived = 'archived';
    case Removed = 'removed';
    case Deleted = 'deleted';
}
