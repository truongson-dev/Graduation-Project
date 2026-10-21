<?php

it('answers the web root', function () {
    $this->get('/')->assertOk()->assertJson(['status' => 'ok']);
});

it('reports api health', function () {
    $this->getJson('/api/health')->assertOk()->assertJson(['status' => 'ok']);
});
