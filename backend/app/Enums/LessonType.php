<?php

namespace App\Enums;

enum LessonType: string
{
    case Theory = 'theory';
    case Quiz = 'quiz';
    case Writing = 'writing';
}
