<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $testingTemp = storage_path('framework/testing/temp');
        if (! is_dir($testingTemp)) {
            @mkdir($testingTemp, 0777, true);
        }
        putenv('TMP=' . $testingTemp);
        putenv('TEMP=' . $testingTemp);
        $_ENV['TMP'] = $testingTemp;
        $_ENV['TEMP'] = $testingTemp;
    }
}
