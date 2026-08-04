import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, Heart, ChevronRight, ArrowLeft, UserPlus, Home, GitBranch, Maximize2, Edit, Trash2, Plus, Save, X } from 'lucide-react';

// Données de la famille Mbacké (exemple représentatif)
let familyDataStore = [
  {
    id: 1,
    nom: "Cheikh Ahmadou Bamba",
    prenom: "Khadimou Rassoul",
    dateNaissance: "1853",
    dateDeces: "1927",
    pere: null,
    mere: null,
    conjoints: [
      { nom: "Mariama Dieng", dateMarriage: "1875" },
      { nom: "Sokhna Maimouna", dateMarriage: "1885" }
    ],
    enfants: [2, 3, 4, 5],
    generation: 1,
    description: "Fondateur du mouridisme, figure spirituelle majeure"
  },
  {
    id: 2,
    nom: "Cheikh Mamadou Moustapha",
    prenom: "Mbacké",
    dateNaissance: "1888",
    dateDeces: "1945",
    pere: 1,
    mere: "Mariama Dieng",
    conjoints: [{ nom: "Sokhna Khady", dateMarriage: "1910" }],
    enfants: [6, 7, 8],
    generation: 2,
    description: "Premier Khalife général des Mourides"
  },
  {
    id: 3,
    nom: "Cheikh Fallou",
    prenom: "Mbacké",
    dateNaissance: "1890",
    dateDeces: "1968",
    pere: 1,
    mere: "Mariama Dieng",
    conjoints: [{ nom: "Sokhna Fatou", dateMarriage: "1912" }],
    enfants: [9, 10],
    generation: 2,
    description: "Deuxième Khalife général des Mourides"
  },
  {
    id: 4,
    nom: "Cheikh Abdou Ahad",
    prenom: "Mbacké",
    dateNaissance: "1892",
    dateDeces: "1989",
    pere: 1,
    mere: "Sokhna Maimouna",
    conjoints: [{ nom: "Sokhna Aida", dateMarriage: "1915" }],
    enfants: [11, 12],
    generation: 2,
    description: "Troisième Khalife général des Mourides"
  },
  {
    id: 5,
    nom: "Cheikh Abdou Khadre",
    prenom: "Mbacké",
    dateNaissance: "1895",
    dateDeces: "1973",
    pere: 1,
    mere: "Sokhna Maimouna",
    conjoints: [{ nom: "Sokhna Mariama", dateMarriage: "1918" }],
    enfants: [13, 14],
    generation: 2,
    description: "Quatrième Khalife général des Mourides"
  },
  {
    id: 6,
    nom: "Serigne Saliou",
    prenom: "Mbacké",
    dateNaissance: "1915",
    dateDeces: "2007",
    pere: 2,
    mere: "Sokhna Khady",
    conjoints: [{ nom: "Sokhna Rokhaya", dateMarriage: "1940" }],
    enfants: [15, 16, 17],
    generation: 3,
    description: "Cinquième Khalife général des Mourides"
  },
  {
    id: 7,
    nom: "Serigne Bara",
    prenom: "Mbacké",
    dateNaissance: "1918",
    dateDeces: "2010",
    pere: 2,
    mere: "Sokhna Khady",
    conjoints: [{ nom: "Sokhna Ndèye", dateMarriage: "1945" }],
    enfants: [18, 19],
    generation: 3,
    description: "Sixième Khalife général des Mourides"
  },
  {
    id: 8,
    nom: "Cheikh Mouhamadou Lamine",
    prenom: "Bara Mbacké",
    dateNaissance: "1925",
    dateDeces: "2018",
    pere: 2,
    mere: "Sokhna Khady",
    conjoints: [{ nom: "Sokhna Aminata", dateMarriage: "1950" }],
    enfants: [20, 21],
    generation: 3,
    description: "Septième Khalife général des Mourides"
  },
  {
    id: 9,
    nom: "Serigne Cheikh",
    prenom: "Tidiane Sy Al Maktoum",
    dateNaissance: "1920",
    dateDeces: "2019",
    pere: 3,
    mere: "Sokhna Fatou",
    conjoints: [{ nom: "Sokhna Khadija", dateMarriage: "1948" }],
    enfants: [22, 23],
    generation: 3,
    description: "Huitième Khalife général des Mourides"
  },
  {
    id: 10,
    nom: "Serigne Mountakha",
    prenom: "Bassirou Mbacké",
    dateNaissance: "1948",
    dateDeces: null,
    pere: 3,
    mere: "Sokhna Fatou",
    conjoints: [{ nom: "Sokhna Mame Diarra", dateMarriage: "1975" }],
    enfants: [24, 25, 26],
    generation: 3,
    description: "Khalife général actuel des Mourides"
  },
  // Génération 4
  {
    id: 15,
    nom: "Serigne Cheikh Sidy Moukhtar",
    prenom: "Mbacké",
    dateNaissance: "1945",
    dateDeces: null,
    pere: 6,
    mere: "Sokhna Rokhaya",
    conjoints: [{ nom: "Sokhna Astou", dateMarriage: "1970" }],
    enfants: [27, 28],
    generation: 4,
    description: "Khalife de Darou Mousty"
  },
  {
    id: 16,
    nom: "Serigne Modou Kara",
    prenom: "Mbacké",
    dateNaissance: "1950",
    dateDeces: null,
    pere: 6,
    mere: "Sokhna Rokhaya",
    conjoints: [{ nom: "Sokhna Selbé", dateMarriage: "1975" }],
    enfants: [29, 30],
    generation: 4,
    description: "Leader spirituel et homme d'affaires"
  }
];

const MbackeGenealogyApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [relationshipPerson1, setRelationshipPerson1] = useState(null);
  const [relationshipPerson2, setRelationshipPerson2] = useState(null);
  const [relationshipResult, setRelationshipResult] = useState('');
  const [treeZoom, setTreeZoom] = useState(1);
  const [treePan, setTreePan] = useState({ x: 0, y: 0 });
  
  // États pour CRUD
  const [familyData, setFamilyData] = useState(familyDataStore);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Formulaire pour ajout/modification
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    dateDeces: '',
    pere: '',
    mere: '',
    conjoints: [],
    enfants: [],
    generation: 1,
    description: ''
  });

  // CRUD Operations
  const addPerson = (newPerson) => {
    const id = Math.max(...familyData.map(p => p.id)) + 1;
    const personWithId = { 
      ...newPerson, 
      id,
      enfants: newPerson.enfants || [],
      conjoints: newPerson.conjoints || []
    };
    
    const updatedData = [...familyData, personWithId];
    setFamilyData(updatedData);
    familyDataStore = updatedData;
    
    // Mettre à jour les relations parentales
    if (newPerson.pere) {
      updateParentChildren(newPerson.pere, id, true);
    }
  };

  const updatePerson = (id, updatedPerson) => {
    const updatedData = familyData.map(person => 
      person.id === id ? { ...person, ...updatedPerson } : person
    );
    setFamilyData(updatedData);
    familyDataStore = updatedData;
    
    if (selectedPerson?.id === id) {
      setSelectedPerson({ ...selectedPerson, ...updatedPerson });
    }
  };

  const deletePerson = (id) => {
    // Supprimer les références dans les relations
    const updatedData = familyData
      .filter(person => person.id !== id)
      .map(person => ({
        ...person,
        enfants: person.enfants ? person.enfants.filter(childId => childId !== id) : [],
        pere: person.pere === id ? null : person.pere
      }));
    
    setFamilyData(updatedData);
    familyDataStore = updatedData;
    
    if (selectedPerson?.id === id) {
      setSelectedPerson(null);
      setCurrentView('home');
    }
  };

  const updateParentChildren = (parentId, childId, add = true) => {
    const updatedData = familyData.map(person => {
      if (person.id === parentId) {
        const currentChildren = person.enfants || [];
        const enfants = add 
          ? [...currentChildren, childId]
          : currentChildren.filter(id => id !== childId);
        return { ...person, enfants };
      }
      return person;
    });
    setFamilyData(updatedData);
    familyDataStore = updatedData;
  };

  // Formulaire d'ajout/modification
  const PersonForm = ({ person = null, onSave, onCancel }) => {
    const [localFormData, setLocalFormData] = useState(
      person ? {
        nom: person.nom || '',
        prenom: person.prenom || '',
        dateNaissance: person.dateNaissance || '',
        dateDeces: person.dateDeces || '',
        pere: person.pere || '',
        mere: person.mere || '',
        generation: person.generation || 1,
        description: person.description || ''
      } : {
        nom: '',
        prenom: '',
        dateNaissance: '',
        dateDeces: '',
        pere: '',
        mere: '',
        generation: 1,
        description: ''
      }
    );

    const [conjointForm, setConjointForm] = useState({ nom: '', dateMarriage: '' });
    const [conjoints, setConjoints] = useState(person?.conjoints || []);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!localFormData.prenom || !localFormData.nom) {
        alert('Le prénom et le nom sont obligatoires');
        return;
      }

      const personData = {
        ...localFormData,
        pere: localFormData.pere ? parseInt(localFormData.pere) : null,
        conjoints,
        enfants: person?.enfants || []
      };

      onSave(personData);
    };

    const addConjoint = () => {
      if (conjointForm.nom && conjointForm.dateMarriage) {
        setConjoints([...conjoints, conjointForm]);
        setConjointForm({ nom: '', dateMarriage: '' });
      }
    };

    const removeConjoint = (index) => {
      setConjoints(conjoints.filter((_, i) => i !== index));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {person ? 'Modifier' : 'Ajouter'} un membre
              </h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={localFormData.prenom}
                    onChange={(e) => setLocalFormData({...localFormData, prenom: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    value={localFormData.nom}
                    onChange={(e) => setLocalFormData({...localFormData, nom: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="text"
                    value={localFormData.dateNaissance}
                    onChange={(e) => setLocalFormData({...localFormData, dateNaissance: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: 1853"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de décès
                  </label>
                  <input
                    type="text"
                    value={localFormData.dateDeces}
                    onChange={(e) => setLocalFormData({...localFormData, dateDeces: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: 1927 (laisser vide si vivant)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Père
                  </label>
                  <select
                    value={localFormData.pere}
                    onChange={(e) => setLocalFormData({...localFormData, pere: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner le père</option>
                    {familyData
                      .filter(p => p.id !== person?.id)
                      .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.prenom} {p.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Génération
                  </label>
                  <input
                    type="number"
                    value={localFormData.generation}
                    onChange={(e) => setLocalFormData({...localFormData, generation: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mère
                </label>
                <input
                  type="text"
                  value={localFormData.mere}
                  onChange={(e) => setLocalFormData({...localFormData, mere: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Nom de la mère"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={localFormData.description}
                  onChange={(e) => setLocalFormData({...localFormData, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows="3"
                  placeholder="Description, titre, fonction..."
                />
              </div>

              {/* Section Conjoints */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mariages
                </label>
                
                {conjoints.map((conjoint, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-50 p-3 rounded-lg mb-2">
                    <div>
                      <span className="font-medium">{conjoint.nom}</span>
                      <span className="text-sm text-gray-600 ml-2">({conjoint.dateMarriage})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeConjoint(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={conjointForm.nom}
                    onChange={(e) => setConjointForm({...conjointForm, nom: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                    placeholder="Nom du conjoint"
                  />
                  <input
                    type="text"
                    value={conjointForm.dateMarriage}
                    onChange={(e) => setConjointForm({...conjointForm, dateMarriage: e.target.value})}
                    className="w-24 p-2 border border-gray-300 rounded-lg"
                    placeholder="Année"
                  />
                  <button
                    type="button"
                    onClick={addConjoint}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {person ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Organiser les données par génération pour l'arbre
  const generationGroups = useMemo(() => {
    const groups = {};
    familyData.forEach(person => {
      if (!groups[person.generation]) {
        groups[person.generation] = [];
      }
      groups[person.generation].push(person);
    });
    return groups;
  }, []);

  // Calculer la position des nœuds pour l'arbre
  const calculateTreeLayout = () => {
    const generations = Object.keys(generationGroups).sort((a, b) => a - b);
    const layout = {};
    
    generations.forEach((gen, genIndex) => {
      const people = generationGroups[gen];
      const genY = genIndex * 200 + 100;
      
      people.forEach((person, personIndex) => {
        const totalWidth = people.length * 180;
        const startX = -totalWidth / 2 + 90;
        const personX = startX + personIndex * 180;
        
        layout[person.id] = {
          x: personX,
          y: genY,
          person
        };
      });
    });
    
    return layout;
  };

  const treeLayout = calculateTreeLayout();

  // Recherche filtrée
  const filteredFamily = useMemo(() => {
    if (!searchTerm) return familyData;
    return familyData.filter(person => 
      `${person.prenom} ${person.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Fonction pour trouver une personne par ID
  const findPersonById = (id) => familyData.find(person => person.id === id);

  // Calcul de parenté (simplifié)
  const calculateRelationship = (person1, person2) => {
    if (!person1 || !person2 || person1.id === person2.id) return "Même personne";
    
    // Parent-enfant direct
    if (person1.enfants?.includes(person2.id)) return `${person1.prenom} est le parent de ${person2.prenom}`;
    if (person2.enfants?.includes(person1.id)) return `${person2.prenom} est le parent de ${person1.prenom}`;
    
    // Frères/sœurs
    if (person1.pere === person2.pere && person1.pere !== null) return "Frères/Sœurs";
    
    // Grands-parents/petits-enfants
    const parent1 = findPersonById(person1.pere);
    const parent2 = findPersonById(person2.pere);
    if (parent1?.enfants?.includes(person2.id)) return `${person1.prenom} est le petit-enfant de ${person2.prenom}`;
    if (parent2?.enfants?.includes(person1.id)) return `${person2.prenom} est le petit-enfant de ${person1.prenom}`;
    
    // Oncle/tante - neveu/nièce
    if (parent1 && parent2 && parent1.pere === parent2.pere && parent1.pere !== null) {
      return "Cousins";
    }
    
    // Différence de génération
    const genDiff = Math.abs(person1.generation - person2.generation);
    if (genDiff === 1) return "Oncle/Tante - Neveu/Nièce";
    if (genDiff === 2) return "Grand-oncle/tante - Petit-neveu/nièce";
    if (genDiff > 2) return `Parenté éloignée (${genDiff} générations d'écart)`;
    
    return "Parenté à déterminer";
  };

  const PersonCard = ({ person, onClick, compact = false }) => (
    <div 
      className={`bg-white rounded-lg shadow-md p-4 mb-3 border-l-4 border-emerald-500 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${compact ? 'p-3' : ''}`}
      onClick={() => onClick(person)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className={`font-bold text-gray-800 ${compact ? 'text-sm' : 'text-lg'}`}>
            {person.prenom} {person.nom}
          </h3>
          {!compact && (
            <>
              <p className="text-gray-600 text-sm mt-1">{person.description}</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                  Génération {person.generation}
                </span>
                {person.dateNaissance && (
                  <span className="text-xs text-gray-500">
                    {person.dateNaissance}{person.dateDeces ? ` - ${person.dateDeces}` : ' - Présent'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Actions CRUD */}
        {!compact && (
          <div className="flex items-center space-x-2 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingPerson(person);
                setIsEditing(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(person.id);
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );

  const PersonDetailView = ({ person }) => {
    const pere = person.pere ? findPersonById(person.pere) : null;
    const enfants = person.enfants ? person.enfants.map(findPersonById).filter(Boolean) : [];

    // Fonction pour créer l'arbre généalogique centré sur cette personne
    const PersonalTreeView = () => {
      // Collecter les ancêtres (parents, grands-parents, etc.)
      const getAncestors = (personId, depth = 0) => {
        if (depth > 3) return []; // Limiter à 3 générations d'ancêtres
        const currentPerson = findPersonById(personId);
        if (!currentPerson) return [];
        
        const ancestors = [{ ...currentPerson, depth: -depth }];
        if (currentPerson.pere) {
          ancestors.push(...getAncestors(currentPerson.pere, depth + 1));
        }
        return ancestors;
      };

      // Collecter les descendants (enfants, petits-enfants, etc.)
      const getDescendants = (personId, depth = 0) => {
        if (depth > 2) return []; // Limiter à 2 générations de descendants
        const currentPerson = findPersonById(personId);
        if (!currentPerson || !currentPerson.enfants) return [];
        
        const descendants = [];
        currentPerson.enfants.forEach(childId => {
          const child = findPersonById(childId);
          if (child) {
            descendants.push({ ...child, depth: depth + 1 });
            descendants.push(...getDescendants(childId, depth + 1));
          }
        });
        return descendants;
      };

      const ancestors = getAncestors(person.id);
      const descendants = getDescendants(person.id);
      const allPersons = [...ancestors, { ...person, depth: 0 }, ...descendants];

      // Calculer les positions
      const calculatePersonalLayout = () => {
        const layout = {};
        const depthGroups = {};
        
        // Grouper par profondeur
        allPersons.forEach(p => {
          if (!depthGroups[p.depth]) depthGroups[p.depth] = [];
          depthGroups[p.depth].push(p);
        });

        // Positionner chaque groupe
        Object.keys(depthGroups).forEach(depth => {
          const depthNum = parseInt(depth);
          const people = depthGroups[depth];
          const y = depthNum * 120; // Espacement vertical
          
          people.forEach((p, index) => {
            const totalWidth = people.length * 160;
            const startX = -totalWidth / 2 + 80;
            const x = startX + index * 160;
            
            layout[p.id] = { x, y, person: p };
          });
        });

        return layout;
      };

      const personalLayout = calculatePersonalLayout();

      const renderPersonalConnections = () => {
        const connections = [];
        
        Object.values(personalLayout).forEach(node => {
          const currentPerson = node.person;
          
          // Connexions vers les enfants
          if (currentPerson.enfants) {
            currentPerson.enfants.forEach(childId => {
              const childNode = personalLayout[childId];
              if (childNode) {
                const parentX = node.x;
                const parentY = node.y + 25;
                const childX = childNode.x;
                const childY = childNode.y - 15;
                
                connections.push(
                  <line
                    key={`${currentPerson.id}-${childId}`}
                    x1={parentX}
                    y1={parentY}
                    x2={childX}
                    y2={childY}
                    stroke="#059669"
                    strokeWidth="2"
                    className="opacity-70"
                  />
                );
                
                // Flèche
                connections.push(
                  <polygon
                    key={`arrow-${currentPerson.id}-${childId}`}
                    points={`${childX-3},${childY-6} ${childX+3},${childY-6} ${childX},${childY-1}`}
                    fill="#059669"
                    className="opacity-70"
                  />
                );
              }
            });
          }
        });
        
        return connections;
      };

      const renderPersonalNodes = () => {
        return Object.values(personalLayout).map(node => {
          const p = node.person;
          const isMainPerson = p.id === person.id;
          
          return (
            <g key={`personal-${p.id}`} transform={`translate(${node.x}, ${node.y})`}>
              {/* Nœud principal avec mise en évidence pour la personne centrale */}
              <rect
                x="-60"
                y="-20"
                width="120"
                height="40"
                rx="6"
                fill={isMainPerson ? "#10b981" : "#ffffff"}
                stroke={isMainPerson ? "#047857" : "#d1d5db"}
                strokeWidth={isMainPerson ? "3" : "2"}
                className={`transition-all duration-200 ${!isMainPerson ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
              />
              
              {/* Icône */}
              <circle
                cx="-35"
                cy="0"
                r="8"
                fill={isMainPerson ? "#ffffff" : "#10b981"}
                className={!isMainPerson ? "cursor-pointer" : ""}
                onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
              />
              <text
                x="-35"
                y="3"
                textAnchor="middle"
                fontSize="8"
                fill={isMainPerson ? "#10b981" : "#ffffff"}
                className={`font-bold ${!isMainPerson ? 'cursor-pointer' : ''}`}
                onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
              >
                {p.prenom.charAt(0)}
              </text>
              
              {/* Nom complet */}
              <text
                x="-20"
                y="-5"
                fontSize="9"
                fontWeight="bold"
                fill={isMainPerson ? "#ffffff" : "#374151"}
                className={!isMainPerson ? "cursor-pointer" : ""}
                onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
              >
                {p.prenom.length > 10 ? p.prenom.substring(0, 10) + '...' : p.prenom}
              </text>
              
              <text
                x="-20"
                y="8"
                fontSize="7"
                fill={isMainPerson ? "#f3f4f6" : "#6b7280"}
                className={!isMainPerson ? "cursor-pointer" : ""}
                onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
              >
                {p.nom}
              </text>
              
              {/* Badge pour la personne centrale */}
              {isMainPerson && (
                <circle
                  cx="45"
                  cy="-15"
                  r="6"
                  fill="#fbbf24"
                />
              )}
              {isMainPerson && (
                <text
                  x="45"
                  y="-11"
                  textAnchor="middle"
                  fontSize="8"
                  fill="white"
                  className="font-bold"
                >
                  ★
                </text>
              )}
              
              {/* Indicateurs de relations */}
              {p.enfants && p.enfants.length > 0 && (
                <circle
                  cx="35"
                  cy="12"
                  r="6"
                  fill="#3b82f6"
                  className={!isMainPerson ? "cursor-pointer" : ""}
                  onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
                />
              )}
              {p.enfants && p.enfants.length > 0 && (
                <text
                  x="35"
                  y="15"
                  textAnchor="middle"
                  fontSize="7"
                  fill="white"
                  className={`font-bold ${!isMainPerson ? 'cursor-pointer' : ''}`}
                  onClick={!isMainPerson ? () => setSelectedPerson(p) : undefined}
                >
                  {p.enfants.length}
                </text>
              )}
            </g>
          );
        });
      };

      return (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <GitBranch className="w-5 h-5 mr-2 text-emerald-600" />
            Arbre Généalogique Personnel
          </h3>
          
          <div className="bg-white rounded-lg shadow-sm p-4 overflow-hidden">
            <svg
              width="100%"
              height="400"
              viewBox="-300 -200 600 400"
              className="w-full"
            >
              {/* Grille légère */}
              <defs>
                <pattern id="personalGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f9fafb" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#personalGrid)" />
              
              {/* Connexions */}
              {renderPersonalConnections()}
              
              {/* Nœuds */}
              {renderPersonalNodes()}
            </svg>
            
            {/* Mini légende */}
            <div className="mt-3 flex items-center justify-center space-x-6 text-xs text-gray-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></div>
                <span>Personne actuelle</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span>Nombre d'enfants</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-1 bg-emerald-600 mr-1"></div>
                <span>Filiation</span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Arbre généalogique personnel */}
        <PersonalTreeView />
        
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{person.prenom}</h1>
          <h2 className="text-xl text-gray-600 mb-2">{person.nom}</h2>
          <p className="text-gray-600 text-sm">{person.description}</p>
          
          {/* Actions CRUD */}
          <div className="flex justify-center mt-4 space-x-3">
            <button
              onClick={() => {
                setEditingPerson(person);
                setIsEditing(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </button>
            <button
              onClick={() => setShowDeleteConfirm(person.id)}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </button>
          </div>
          
          <div className="flex justify-center mt-4 space-x-4">
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
              Génération {person.generation}
            </span>
            {person.dateNaissance && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {person.dateNaissance}{person.dateDeces ? ` - ${person.dateDeces}` : ' - Présent'}
              </span>
            )}
          </div>
        </div>

        {/* Parents */}
        {pere && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Users className="w-5 h-5 mr-2 text-emerald-600" />
              Père
            </h3>
            <PersonCard person={pere} onClick={setSelectedPerson} compact />
          </div>
        )}

        {/* Conjoints */}
        {person.conjoints && person.conjoints.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              Mariage{person.conjoints.length > 1 ? 's' : ''}
            </h3>
            {person.conjoints.map((conjoint, index) => (
              <div key={index} className="bg-red-50 rounded-lg p-3 mb-2 border-l-4 border-red-200">
                <p className="font-medium text-gray-800">{conjoint.nom}</p>
                <p className="text-sm text-gray-600">Marié en {conjoint.dateMarriage}</p>
              </div>
            ))}
          </div>
        )}

        {/* Enfants */}
        {enfants.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
              Enfants ({enfants.length})
            </h3>
            {enfants.map(enfant => (
              <PersonCard key={enfant.id} person={enfant} onClick={setSelectedPerson} compact />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Composant pour l'arbre généalogique hiérarchique
  const FamilyTreeView = () => {
    const handlePersonClick = (person) => {
      setSelectedPerson(person);
      setCurrentView('detail');
    };

    const renderConnections = () => {
      const connections = [];
      
      Object.values(treeLayout).forEach(node => {
        const person = node.person;
        
        // Dessiner les connexions parent-enfant
        if (person.enfants) {
          person.enfants.forEach(childId => {
            const childNode = treeLayout[childId];
            if (childNode) {
              const parentX = node.x;
              const parentY = node.y + 40; // Bas du nœud parent
              const childX = childNode.x;
              const childY = childNode.y - 10; // Haut du nœud enfant
              
              // Ligne en L (parent -> point médian -> enfant)
              const midY = parentY + (childY - parentY) / 2;
              
              connections.push(
                <g key={`${person.id}-${childId}`}>
                  {/* Ligne verticale du parent */}
                  <line
                    x1={parentX}
                    y1={parentY}
                    x2={parentX}
                    y2={midY}
                    stroke="#059669"
                    strokeWidth="2"
                    className="opacity-60"
                  />
                  {/* Ligne horizontale */}
                  <line
                    x1={parentX}
                    y1={midY}
                    x2={childX}
                    y2={midY}
                    stroke="#059669"
                    strokeWidth="2"
                    className="opacity-60"
                  />
                  {/* Ligne verticale vers l'enfant */}
                  <line
                    x1={childX}
                    y1={midY}
                    x2={childX}
                    y2={childY}
                    stroke="#059669"
                    strokeWidth="2"
                    className="opacity-60"
                  />
                  {/* Flèche */}
                  <polygon
                    points={`${childX-4},${childY-8} ${childX+4},${childY-8} ${childX},${childY}`}
                    fill="#059669"
                    className="opacity-60"
                  />
                </g>
              );
            }
          });
        }
      });
      
      return connections;
    };

    const renderNodes = () => {
      return Object.values(treeLayout).map(node => {
        const person = node.person;
        const isSelected = selectedPerson?.id === person.id;
        
        return (
          <g key={person.id} transform={`translate(${node.x}, ${node.y})`}>
            {/* Nœud principal */}
            <rect
              x="-70"
              y="-30"
              width="140"
              height="60"
              rx="8"
              fill={isSelected ? "#10b981" : "#ffffff"}
              stroke={isSelected ? "#047857" : "#d1d5db"}
              strokeWidth="2"
              className="cursor-pointer hover:shadow-lg transition-all duration-200"
              onClick={() => handlePersonClick(person)}
            />
            
            {/* Icône */}
            <circle
              cx="-45"
              cy="0"
              r="12"
              fill={isSelected ? "#ffffff" : "#10b981"}
              className="cursor-pointer"
              onClick={() => handlePersonClick(person)}
            />
            <text
              x="-45"
              y="4"
              textAnchor="middle"
              fontSize="10"
              fill={isSelected ? "#10b981" : "#ffffff"}
              className="cursor-pointer font-bold"
              onClick={() => handlePersonClick(person)}
            >
              {person.prenom.charAt(0)}
            </text>
            
            {/* Nom */}
            <text
              x="-25"
              y="-8"
              fontSize="11"
              fontWeight="bold"
              fill={isSelected ? "#ffffff" : "#374151"}
              className="cursor-pointer"
              onClick={() => handlePersonClick(person)}
            >
              {person.prenom.length > 12 ? person.prenom.substring(0, 12) + '...' : person.prenom}
            </text>
            
            {/* Nom de famille */}
            <text
              x="-25"
              y="6"
              fontSize="9"
              fill={isSelected ? "#f3f4f6" : "#6b7280"}
              className="cursor-pointer"
              onClick={() => handlePersonClick(person)}
            >
              {person.nom}
            </text>
            
            {/* Génération */}
            <text
              x="-25"
              y="20"
              fontSize="8"
              fill={isSelected ? "#f3f4f6" : "#9ca3af"}
              className="cursor-pointer"
              onClick={() => handlePersonClick(person)}
            >
              Gen. {person.generation}
            </text>
            
            {/* Indicateur de conjoints */}
            {person.conjoints && person.conjoints.length > 0 && (
              <circle
                cx="55"
                cy="-20"
                r="8"
                fill="#ef4444"
                className="cursor-pointer"
                onClick={() => handlePersonClick(person)}
              />
            )}
            {person.conjoints && person.conjoints.length > 0 && (
              <text
                x="55"
                y="-16"
                textAnchor="middle"
                fontSize="10"
                fill="white"
                className="cursor-pointer font-bold"
                onClick={() => handlePersonClick(person)}
              >
                ♥
              </text>
            )}
            
            {/* Indicateur d'enfants */}
            {person.enfants && person.enfants.length > 0 && (
              <circle
                cx="55"
                cy="20"
                r="8"
                fill="#3b82f6"
                className="cursor-pointer"
                onClick={() => handlePersonClick(person)}
              />
            )}
            {person.enfants && person.enfants.length > 0 && (
              <text
                x="55"
                y="24"
                textAnchor="middle"
                fontSize="8"
                fill="white"
                className="cursor-pointer font-bold"
                onClick={() => handlePersonClick(person)}
              >
                {person.enfants.length}
              </text>
            )}
          </g>
        );
      });
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-4 h-[70vh] overflow-hidden relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Arbre Généalogique</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setTreeZoom(Math.min(treeZoom * 1.2, 3))}
              className="p-2 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={() => {
                setTreeZoom(1);
                setTreePan({ x: 0, y: 0 });
              }}
              className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Reset
            </button>
          </div>
        </div>
        
        <div 
          className="w-full h-full overflow-auto cursor-move"
          style={{ 
            background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 1) 100%)'
          }}
        >
          <svg
            width="100%"
            height="600"
            viewBox="-400 -50 800 500"
            className="w-full h-full"
            style={{
              transform: `scale(${treeZoom}) translate(${treePan.x}px, ${treePan.y}px)`
            }}
          >
            {/* Grille de fond */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Connexions */}
            {renderConnections()}
            
            {/* Nœuds */}
            {renderNodes()}
          </svg>
        </div>
        
        {/* Légende */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Légende</h4>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span>Mariages</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              <span>Enfants</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1 bg-emerald-600 mr-1"></div>
              <span>Filiation</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RelationshipCalculator = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
        Calculateur de Parenté
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Première personne
          </label>
          <select
            value={relationshipPerson1?.id || ''}
            onChange={(e) => {
              const person = findPersonById(parseInt(e.target.value));
              setRelationshipPerson1(person);
              if (person && relationshipPerson2) {
                setRelationshipResult(calculateRelationship(person, relationshipPerson2));
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Sélectionner une personne</option>
            {familyData.map(person => (
              <option key={person.id} value={person.id}>
                {person.prenom} {person.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deuxième personne
          </label>
          <select
            value={relationshipPerson2?.id || ''}
            onChange={(e) => {
              const person = findPersonById(parseInt(e.target.value));
              setRelationshipPerson2(person);
              if (relationshipPerson1 && person) {
                setRelationshipResult(calculateRelationship(relationshipPerson1, person));
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Sélectionner une personne</option>
            {familyData.map(person => (
              <option key={person.id} value={person.id}>
                {person.prenom} {person.nom}
              </option>
            ))}
          </select>
        </div>

        {relationshipResult && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
            <h3 className="font-semibold text-emerald-800 mb-2">Relation de parenté :</h3>
            <p className="text-emerald-700">{relationshipResult}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            {currentView !== 'home' && (
              <button
                onClick={() => {
                  if (currentView === 'detail') setCurrentView('home');
                  else if (currentView === 'relationship') setCurrentView('home');
                  else if (currentView === 'tree') setCurrentView('home');
                  setSelectedPerson(null);
                }}
                className="flex items-center text-white hover:text-emerald-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Retour
              </button>
            )}
            
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">Famille Mbacké</h1>
              <p className="text-emerald-100 text-sm mt-1">Arbre Généalogique</p>
            </div>
            
            {currentView === 'home' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentView('tree')}
                  className="bg-emerald-500 hover:bg-emerald-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <GitBranch className="w-4 h-4 mr-1" />
                  Arbre
                </button>
                <button
                  onClick={() => setCurrentView('relationship')}
                  className="bg-emerald-500 hover:bg-emerald-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Parenté
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {currentView === 'home' && (
          <>
            {/* Barre de recherche */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un membre de la famille..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>

            {/* Liste des membres */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Membres de la famille ({filteredFamily.length})
                </h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </button>
              </div>
              
              {filteredFamily.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onClick={(person) => {
                    setSelectedPerson(person);
                    setCurrentView('detail');
                  }}
                />
              ))}
            </div>
          </>
        )}

        {currentView === 'tree' && (
          <FamilyTreeView />
        )}

        {currentView === 'detail' && selectedPerson && (
          <PersonDetailView person={selectedPerson} />
        )}

        {currentView === 'relationship' && (
          <RelationshipCalculator />
        )}
      </div>

      {/* Navigation fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around py-2">
          <button
            onClick={() => {
              setCurrentView('home');
              setSelectedPerson(null);
            }}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentView === 'home' 
                ? 'text-emerald-600 bg-emerald-50' 
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Accueil</span>
          </button>
          
          <button
            onClick={() => setCurrentView('tree')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentView === 'tree' 
                ? 'text-emerald-600 bg-emerald-50' 
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            <GitBranch className="w-5 h-5" />
            <span className="text-xs mt-1">Arbre</span>
          </button>
          
          <button
            onClick={() => setCurrentView('relationship')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentView === 'relationship' 
                ? 'text-emerald-600 bg-emerald-50' 
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs mt-1">Parenté</span>
          </button>
        </div>
      </div>

      {/* Padding pour la navigation fixe */}
      <div className="h-16"></div>

      {/* Modals CRUD */}
      {showAddForm && (
        <PersonForm
          onSave={(personData) => {
            addPerson(personData);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {isEditing && editingPerson && (
        <PersonForm
          person={editingPerson}
          onSave={(personData) => {
            updatePerson(editingPerson.id, personData);
            setIsEditing(false);
            setEditingPerson(null);
          }}
          onCancel={() => {
            setIsEditing(false);
            setEditingPerson(null);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  deletePerson(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MbackeGenealogyApp;