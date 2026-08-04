<?php

namespace App\Http\Requests;

use App\Models\Person;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $tree = $this->route('tree');

        // Owner/admin write directly; any other tree member proposes instead
        // (PersonController branches on which ability actually matched).
        return $this->user()->can('create', [Person::class, $tree])
            || $this->user()->can('proposeCreate', [Person::class, $tree]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'in:male,female'],
            'birth_date' => ['nullable', 'date'],
            'death_date' => ['nullable', 'date', 'after_or_equal:birth_date'],
            'bio' => ['nullable', 'string'],
            'is_public' => ['boolean'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ];
    }
}
