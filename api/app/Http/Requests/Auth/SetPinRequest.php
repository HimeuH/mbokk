<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SetPinRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated user may set their own PIN — the controller
        // still refuses if pin_hash is already set (see AuthController::setPin()).
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'pin' => ['required', 'string', 'regex:/^\d{4}$/'],
        ];
    }
}
