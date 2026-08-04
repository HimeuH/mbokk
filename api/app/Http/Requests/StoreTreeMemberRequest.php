<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTreeMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageMembers', $this->route('tree'));
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string'],
            // Owner is assigned once at tree creation, never via invite.
            'role' => ['required', 'in:admin,contributor'],
        ];
    }
}
