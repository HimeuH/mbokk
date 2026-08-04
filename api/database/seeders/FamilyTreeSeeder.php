<?php

namespace Database\Seeders;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the real Mbacké lineage around Cheikh Ahmadou Bamba: both ascendance
 * branches up to the shared ancestor Mame Mahram Mbacké, and his sons as
 * reported to the project (2026-07-30) — not the earlier placeholder
 * khalife-succession data from `mbacke-genealogy-app.tsx`, which mixed
 * fictional dates/spouses in for demo purposes.
 *
 * Every person (including mothers/wives) is now a full top-level entry with
 * its own id, `pere_id`/`mere_id` and `gender` — unlike the previous schema,
 * which only gave fathers an id and matched mothers to a father's
 * `conjoints` list by name, so a mother could never have her own parents
 * recorded (e.g. Mame Diarra Bousso's own father and mother).
 */
class FamilyTreeSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::firstOrCreate(
            ['phone' => '+221770000001'],
            ['name' => 'Admin Mbacké']
        );

        $tree = FamilyTree::firstOrCreate(
            ['slug' => 'mbacke'],
            [
                'name' => 'Famille Mbacké',
                'description' => 'Lignée du fondateur du mouridisme, Cheikh Ahmadou Bamba.',
                'owner_user_id' => $owner->id,
            ]
        );

        TreeMember::firstOrCreate(
            ['family_tree_id' => $tree->id, 'user_id' => $owner->id],
            ['role' => 'owner']
        );

        $raw = $this->rawData();

        /** @var array<int, Person> $people keyed by the id below */
        $people = [];
        foreach ($raw as $entry) {
            $people[$entry['id']] = Person::create([
                'owning_family_tree_id' => $tree->id,
                'first_name' => $entry['first_name'],
                'last_name' => $entry['last_name'],
                'gender' => $entry['gender'],
                'birth_date' => $entry['birth_year'] ? "{$entry['birth_year']}-01-01" : null,
                'death_date' => $entry['death_year'] ? "{$entry['death_year']}-01-01" : null,
                'bio' => $entry['description'],
                'is_public' => true,
                'created_by' => $owner->id,
            ]);
        }

        foreach ($raw as $entry) {
            $person = $people[$entry['id']];

            foreach ($entry['conjoints'] as $conjoint) {
                Relationship::firstOrCreate([
                    'person_id' => $person->id,
                    'related_person_id' => $people[$conjoint['id']]->id,
                    'type' => 'spouse_of',
                ], [
                    'marriage_date' => $conjoint['marriage_year'] ? "{$conjoint['marriage_year']}-01-01" : null,
                ]);
            }
        }

        foreach ($raw as $entry) {
            $child = $people[$entry['id']];

            foreach (['pere_id', 'mere_id'] as $parentKey) {
                if ($entry[$parentKey] === null) {
                    continue;
                }

                Relationship::firstOrCreate([
                    'person_id' => $people[$entry[$parentKey]]->id,
                    'related_person_id' => $child->id,
                    'type' => 'parent_of',
                ]);
            }
        }
    }

    /**
     * @return list<array{
     *     id: int, first_name: string, last_name: string, gender: string,
     *     pere_id: ?int, mere_id: ?int,
     *     birth_year: ?string, death_year: ?string,
     *     conjoints: list<array{id: int, marriage_year: ?string}>,
     *     description: string,
     * }>
     */
    private function rawData(): array
    {
        return [
            // Ascendance commune — grand ancêtre des deux branches.
            ['id' => 1, 'first_name' => 'Mame Mahram', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => null, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Savant et cadi (juge musulman), considéré comme le fondateur de l\'ancien village de Mbacké et grand ancêtre de la lignée Mbacké. Les sources disponibles documentent peu de détails précis sur sa vie.'],

            // Ascendance paternelle.
            ['id' => 2, 'first_name' => 'Mame Balla Aïcha', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 1, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Mame Mahram Mbacké, rattaché à la branche paternelle de Cheikh Ahmadou Bamba. Peu de détails biographiques indépendants sont documentés à son sujet.'],
            ['id' => 3, 'first_name' => 'Mame Mor Anta Saly', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 2, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [['id' => 6, 'marriage_year' => null]], 'description' => 'Savant et cadi musulman, il exerça comme conseiller religieux et juge dans les cours royales wolof de la région du Baol avant de s\'établir et de fonder le village de Mbacké-Baol, où naquit en 1853 son fils Cheikh Ahmadou Bamba, fondateur du mouridisme.'],

            // Ascendance maternelle.
            ['id' => 4, 'first_name' => 'Serigne Mouhamadou', 'last_name' => 'Bousso', 'gender' => 'male', 'pere_id' => null, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [['id' => 5, 'marriage_year' => null]], 'description' => 'Grand-père maternel de Cheikh Ahmadou Bamba, aussi appelé Mabousso. Peu de détails biographiques indépendants sont documentés à son sujet.'],
            ['id' => 5, 'first_name' => 'Sokhna Astou Walo', 'last_name' => 'Mbacké', 'gender' => 'female', 'pere_id' => 1, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Grand-mère maternelle de Cheikh Ahmadou Bamba. Selon la tradition généalogique mouride, elle serait également rattachée à Mame Mahram Mbacké — un lien non confirmé par des sources indépendantes.'],
            ['id' => 6, 'first_name' => 'Sokhna Mariama', 'last_name' => 'Bousso', 'gender' => 'female', 'pere_id' => 4, 'mere_id' => 5, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Mère de Cheikh Ahmadou Bamba, également appelée Mame Diarra Bousso ou Jaaratullaahi (« voisine de Dieu »). Figure vénérée dans la tradition mouride comme modèle de piété, de patience et de dévotion. Son mausolée à Porokhane, dans le Saloum, est un lieu de pèlerinage majeur qui accueille chaque année un grand Magal en son honneur.'],

            // Le fondateur.
            ['id' => 7, 'first_name' => 'Cheikh Ahmadou Bamba', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 3, 'mere_id' => 6, 'birth_year' => '1853', 'death_year' => '1927', 'conjoints' => [], 'description' => 'Fondateur du mouridisme (la Muridiyya), confrérie soufie sénégalaise. Né en 1853 à Mbacké-Baol, mort en 1927 à Diourbel. Surnommé Khadimou Rassoul (« serviteur du Prophète ») et connu de ses disciples comme Serigne Touba. Il enseigna le travail comme une forme d\'adoration (la « khidma ») et fonda la ville sainte de Touba, où se dresse la Grande Mosquée. Inquiètes de son influence grandissante, les autorités coloniales françaises l\'exilèrent au Gabon (1895-1902) puis en Mauritanie (1903-1907) ; son retour d\'exil est commémoré chaque année par le Grand Magal de Touba. Auteur prolifique de qasidas et de traités religieux en arabe. Nom arabe : Aḥmad ibn Muḥammad ibn Ḥabīb Allāh.'],

            // Ses fils (liste communiquée, non exhaustive — Serigne Touba eut aussi de nombreuses filles, non documentées ici).
            ['id' => 8, 'first_name' => 'Cheikh Mouhamadou Moustapha', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils aîné de Cheikh Ahmadou Bamba et premier khalife général des Mourides, à la tête de la confrérie de 1927, à la mort de son père, jusqu\'à la sienne en 1945.'],
            ['id' => 9, 'first_name' => 'Cheikh Mouhamadou Fadilou', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Aussi appelé Serigne Fallou. Deuxième khalife général des Mourides, de 1945 à 1968.'],
            ['id' => 10, 'first_name' => 'Cheikh Abdoul Ahad', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Troisième khalife général des Mourides, de 1968 à 1989.'],
            ['id' => 11, 'first_name' => 'Cheikh Abdoul Khadre', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Quatrième khalife général des Mourides, de 1989 à 1996 environ (dates de transition approximatives selon les sources courantes).'],
            ['id' => 12, 'first_name' => 'Cheikh Saliou', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Cinquième khalife général des Mourides, de 1996 à 2007 environ (dates de transition approximatives selon les sources courantes).'],
            ['id' => 13, 'first_name' => 'Cheikh Mouhamadou', 'last_name' => 'Bassirou Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
            ['id' => 14, 'first_name' => 'Cheikh Mouhamadou Lamine', 'last_name' => 'Bara Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
            ['id' => 15, 'first_name' => 'Cheikh Abdoulaye', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
            ['id' => 16, 'first_name' => 'Cheikh Ibrahima', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
            ['id' => 17, 'first_name' => 'Cheikh Abdou Samad', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
            ['id' => 18, 'first_name' => 'Cheikh Souhaibou', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
            ['id' => 19, 'first_name' => 'Cheikh Mourtada', 'last_name' => 'Mbacké', 'gender' => 'male', 'pere_id' => 7, 'mere_id' => null, 'birth_year' => null, 'death_year' => null, 'conjoints' => [], 'description' => 'Fils de Cheikh Ahmadou Bamba.'],
        ];
    }
}
