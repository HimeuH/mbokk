<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $person = $this->route('person');

        return $this->user()->can('update', $person)
            || $this->user()->can('proposeOnPerson', $person);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', 'in:male,female'],
            'birth_date' => ['nullable', 'date'],
            'death_date' => ['nullable', 'date', 'after_or_equal:birth_date'],
            'bio' => ['nullable', 'string'],
            'is_public' => ['boolean'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ];
    }
}
