<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningPath extends Model
{
    protected $fillable = ['slug', 'title', 'subtitle', 'icon', 'sort_order', 'status', 'lessons'];

    protected function casts(): array
    {
        return ['lessons' => 'array', 'sort_order' => 'integer'];
    }
}
