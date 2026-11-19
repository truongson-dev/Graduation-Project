<?php

namespace App\Enums;

enum LessonProgressStatus: string
{
    case Locked = 'locked';
    case Unlocked = 'unlocked';
    case InProgress = 'in_progress';
    case Passed = 'passed';
    case Failed = 'failed';
}
