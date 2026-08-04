<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAccessRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Unauthenticated by design — this exists for someone with no session.
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string'],
            'message' => ['nullable', 'string', 'max:500'],
        ];
    }
}
