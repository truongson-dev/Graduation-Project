<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Support\Str;

trait NormalizesEmail
{
    /**
     * Normalize the e-mail address before the validation rules run.
     */
    protected function prepareForValidation(): void
    {
        $email = $this->input('email');

        if (is_string($email)) {
            $this->merge(['email' => Str::lower(trim($email))]);
        }
    }
}
