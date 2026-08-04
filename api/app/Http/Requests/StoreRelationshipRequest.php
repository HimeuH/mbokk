<?php

namespace App\Http\Requests;

use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreRelationshipRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Adding a relationship is editing the source person — same bar as
        // any other write, even though the target may belong to another tree.
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
            'related_person_id' => ['required', 'integer', 'exists:people,id'],
            'type' => ['required', 'in:parent_of,spouse_of'],
            'marriage_date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var Person $person */
            $person = $this->route('person');
            $relatedId = (int) $this->input('related_person_id');
            $type = $this->input('type');

            if ($relatedId === $person->id) {
                $validator->errors()->add(
                    'related_person_id',
                    'Une personne ne peut pas être en relation avec elle-même.',
                );

                return;
            }

            if ($type === 'parent_of' && Person::wouldCreateCycle($person->id, $relatedId)) {
                $validator->errors()->add(
                    'related_person_id',
                    'Ce lien créerait un cycle généalogique : la personne deviendrait son propre ancêtre.',
                );

                return;
            }

            $duplicate = Relationship::where('type', $type)
                ->where(function ($query) use ($person, $relatedId, $type) {
                    $query->where('person_id', $person->id)->where('related_person_id', $relatedId);

                    // spouse_of has no canonical side — check both directions.
                    if ($type === 'spouse_of') {
                        $query->orWhere(function ($query) use ($person, $relatedId) {
                            $query->where('person_id', $relatedId)->where('related_person_id', $person->id);
                        });
                    }
                })
                ->exists();

            if ($duplicate) {
                $validator->errors()->add('related_person_id', 'Cette relation existe déjà.');
            }
        });
    }
}
