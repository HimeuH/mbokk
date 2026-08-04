<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

/**
 * Single response envelope for every API endpoint:
 *   success: {"success": true, "data": ..., "message"?: ...}
 *   error:   {"success": false, "message": ..., "errors"?: ...}
 *
 * `data` is omitted (not null) when there's nothing to return, so a 204
 * delete produces a real empty body rather than {"data": null}.
 */
class ApiResponse
{
    public static function success(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        if ($status === 204) {
            return response()->json(null, 204);
        }

        $payload = ['success' => true];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }

    public static function error(string $message, int $status = 400, ?array $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    /**
     * Laravel's default policy-denial message ("This action is unauthorized.")
     * isn't translated by any lang file — swap it for our French default
     * unless a policy explicitly set a custom message via `Response::deny()`.
     */
    public static function authorizationMessage(string $message): string
    {
        return $message !== '' && $message !== 'This action is unauthorized.'
            ? $message
            : 'Action non autorisée.';
    }
}
