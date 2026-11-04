<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Data;

class OAuthIntentData extends Data
{
    public function __construct(
        public ?string $device_name,
        public ?string $client,
    ) {}
}
