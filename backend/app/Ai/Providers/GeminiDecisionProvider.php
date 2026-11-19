<?php

namespace App\Ai\Providers;

use App\Ai\Gateways\GeminiDecisionGateway;
use Illuminate\Contracts\Events\Dispatcher;
use Laravel\Ai\Contracts\Gateway\ClassificationGateway;
use Laravel\Ai\Contracts\Providers\ClassificationProvider;
use Laravel\Ai\Providers\Concerns\Classifies;
use Laravel\Ai\Providers\Concerns\HasClassificationGateway;
use Laravel\Ai\Providers\Provider;

class GeminiDecisionProvider extends Provider implements ClassificationProvider
{
    use Classifies;
    use HasClassificationGateway;

    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        protected array $config,
        protected Dispatcher $events,
    ) {}

    /**
     * Get the credentials for the underlying Gemini Decisions API.
     *
     * @return array<string, mixed>
     */
    public function providerCredentials(): array
    {
        return [
            'key' => $this->config['key'] ?? config('ai.providers.gemini.key'),
        ];
    }

    /**
     * Get the name of the default classification model.
     */
    public function defaultClassificationModel(): string
    {
        return (string) ($this->config['models']['classification']['default'] ?? 'gemini-decision-1');
    }

    /**
     * Get the provider's classification gateway.
     */
    public function classificationGateway(): ClassificationGateway
    {
        return $this->classificationGateway ??= new GeminiDecisionGateway;
    }
}
