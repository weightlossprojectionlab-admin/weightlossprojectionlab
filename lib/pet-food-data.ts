/**
 * Pet Food Data
 * Species-specific food brands and types
 */

export interface PetFoodOptions {
  brands: string[]
  foodTypes: Array<{ value: string; label: string }>
  servingUnits: Array<{ value: string; label: string }>
}

export const PET_FOOD_DATA: Record<string, PetFoodOptions> = {
  Dog: {
    brands: [
      'Purina',
      'Blue Buffalo',
      'Hill\'s Science Diet',
      'Royal Canin',
      'Pedigree',
      'Iams',
      'Wellness',
      'Taste of the Wild',
      'Orijen',
      'Nutro',
      'Merrick',
      'Canidae',
      'Fromm',
      'Acana',
      'Instinct',
      'Victor',
      'Diamond Naturals',
      'Kirkland (Costco)',
      'Other'
    ],
    foodTypes: [
      { value: 'dry', label: 'Dry Kibble' },
      { value: 'wet', label: 'Wet/Canned' },
      { value: 'raw', label: 'Raw Diet' },
      { value: 'freeze-dried', label: 'Freeze-Dried' },
      { value: 'homemade', label: 'Homemade' },
      { value: 'prescription', label: 'Prescription Diet' }
    ],
    servingUnits: [
      { value: 'cups', label: 'Cups' },
      { value: 'grams', label: 'Grams' },
      { value: 'oz', label: 'Ounces' },
      { value: 'cans', label: 'Cans' }
    ]
  },
  Cat: {
    brands: [
      'Purina',
      'Fancy Feast',
      'Friskies',
      'Blue Buffalo',
      'Hill\'s Science Diet',
      'Royal Canin',
      'Iams',
      'Wellness',
      'Taste of the Wild',
      'Orijen',
      'Nutro',
      'Merrick',
      'Weruva',
      'Tiki Cat',
      'Instinct',
      'Sheba',
      'Meow Mix',
      'Kirkland (Costco)',
      'Other'
    ],
    foodTypes: [
      { value: 'dry', label: 'Dry Kibble' },
      { value: 'wet', label: 'Wet/Canned' },
      { value: 'raw', label: 'Raw Diet' },
      { value: 'freeze-dried', label: 'Freeze-Dried' },
      { value: 'homemade', label: 'Homemade' },
      { value: 'prescription', label: 'Prescription Diet' }
    ],
    servingUnits: [
      { value: 'cups', label: 'Cups' },
      { value: 'grams', label: 'Grams' },
      { value: 'oz', label: 'Ounces' },
      { value: 'cans', label: 'Cans' }
    ]
  },
  Bird: {
    brands: [
      'Zupreem',
      'Harrison\'s',
      'Roudybush',
      'Lafeber',
      'Kaytee',
      'Higgins',
      'Volkman',
      'TOP\'s',
      'Pretty Bird',
      'Mazuri',
      'Other'
    ],
    foodTypes: [
      { value: 'pellets', label: 'Pellets' },
      { value: 'seeds', label: 'Seed Mix' },
      { value: 'fresh', label: 'Fresh Foods (Fruits/Veggies)' },
      { value: 'treats', label: 'Treats' },
      { value: 'mixed', label: 'Mixed Diet' }
    ],
    servingUnits: [
      { value: 'tbsp', label: 'Tablespoons' },
      { value: 'grams', label: 'Grams' },
      { value: 'cups', label: 'Cups' }
    ]
  },
  Fish: {
    brands: [
      'Tetra',
      'Hikari',
      'Omega One',
      'API',
      'Fluval',
      'New Life Spectrum',
      'Northfin',
      'Aqueon',
      'Wardley',
      'Other'
    ],
    foodTypes: [
      { value: 'flakes', label: 'Flakes' },
      { value: 'pellets', label: 'Pellets' },
      { value: 'granules', label: 'Granules' },
      { value: 'wafers', label: 'Wafers/Tablets' },
      { value: 'frozen', label: 'Frozen Foods' },
      { value: 'live', label: 'Live Foods' }
    ],
    servingUnits: [
      { value: 'pinch', label: 'Pinch' },
      { value: 'grams', label: 'Grams' },
      { value: 'pellets', label: 'Pellets' },
      { value: 'cubes', label: 'Cubes (Frozen)' }
    ]
  },
  Rabbit: {
    brands: [
      'Oxbow',
      'Small Pet Select',
      'Kaytee',
      'Sherwood',
      'Supreme',
      'Vitakraft',
      'Other'
    ],
    foodTypes: [
      { value: 'hay', label: 'Hay (Timothy, Alfalfa)' },
      { value: 'pellets', label: 'Pellets' },
      { value: 'fresh', label: 'Fresh Vegetables' },
      { value: 'treats', label: 'Treats' }
    ],
    servingUnits: [
      { value: 'cups', label: 'Cups' },
      { value: 'grams', label: 'Grams' },
      { value: 'handfuls', label: 'Handfuls' },
      { value: 'tbsp', label: 'Tablespoons' }
    ]
  },
  'Guinea Pig': {
    brands: [
      'Oxbow',
      'Small Pet Select',
      'Kaytee',
      'Supreme',
      'Vitakraft',
      'Other'
    ],
    foodTypes: [
      { value: 'hay', label: 'Hay (Timothy)' },
      { value: 'pellets', label: 'Pellets (Vitamin C fortified)' },
      { value: 'fresh', label: 'Fresh Vegetables' },
      { value: 'treats', label: 'Treats' }
    ],
    servingUnits: [
      { value: 'cups', label: 'Cups' },
      { value: 'grams', label: 'Grams' },
      { value: 'tbsp', label: 'Tablespoons' }
    ]
  },
  Hamster: {
    brands: [
      'Oxbow',
      'Higgins',
      'Kaytee',
      'Vitakraft',
      'Brown\'s',
      'Other'
    ],
    foodTypes: [
      { value: 'pellets', label: 'Pellets' },
      { value: 'seeds', label: 'Seed Mix' },
      { value: 'fresh', label: 'Fresh Foods' },
      { value: 'treats', label: 'Treats' }
    ],
    servingUnits: [
      { value: 'tbsp', label: 'Tablespoons' },
      { value: 'grams', label: 'Grams' }
    ]
  },
  Reptile: {
    brands: [
      'Zoo Med',
      'Repashy',
      'Fluker\'s',
      'Exo Terra',
      'Rep-Cal',
      'Mazuri',
      'Other'
    ],
    foodTypes: [
      { value: 'insects', label: 'Live Insects' },
      { value: 'pellets', label: 'Pellets' },
      { value: 'frozen', label: 'Frozen Prey' },
      { value: 'vegetables', label: 'Vegetables/Greens' },
      { value: 'fruits', label: 'Fruits' },
      { value: 'supplements', label: 'Supplements/Powder' }
    ],
    servingUnits: [
      { value: 'insects', label: 'Insects' },
      { value: 'grams', label: 'Grams' },
      { value: 'oz', label: 'Ounces' },
      { value: 'handfuls', label: 'Handfuls' }
    ]
  },
  // Livestock/Farm Animals
  Horse: {
    brands: [
      'Purina',
      'Triple Crown',
      'Nutrena',
      'Tribute',
      'Buckeye',
      'ADM',
      'Blue Seal',
      'Local Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'hay', label: 'Hay (Timothy, Alfalfa, Grass)' },
      { value: 'grain', label: 'Grain/Concentrate' },
      { value: 'pellets', label: 'Pelleted Feed' },
      { value: 'pasture', label: 'Pasture Grazing' },
      { value: 'supplements', label: 'Supplements/Minerals' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'flakes', label: 'Flakes (Hay)' },
      { value: 'scoops', label: 'Scoops' },
      { value: 'cups', label: 'Cups' }
    ]
  },
  Cow: {
    brands: [
      'Purina',
      'ADM',
      'Cargill',
      'Land O\'Lakes',
      'Hi-Pro',
      'Local Feed Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'hay', label: 'Hay (Grass, Alfalfa)' },
      { value: 'silage', label: 'Silage' },
      { value: 'grain', label: 'Grain Mix' },
      { value: 'pellets', label: 'Pelleted Feed' },
      { value: 'pasture', label: 'Pasture Grazing' },
      { value: 'supplements', label: 'Mineral/Vitamin Supplements' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'kg', label: 'Kilograms' },
      { value: 'bales', label: 'Bales' },
      { value: 'scoops', label: 'Scoops' }
    ]
  },
  Pig: {
    brands: [
      'Purina',
      'Nutrena',
      'ADM',
      'Mazuri',
      'Manna Pro',
      'Local Feed Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'pellets', label: 'Pelleted Feed' },
      { value: 'grain', label: 'Grain Mix' },
      { value: 'vegetables', label: 'Vegetables/Produce' },
      { value: 'forage', label: 'Pasture/Forage' },
      { value: 'supplements', label: 'Supplements' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'cups', label: 'Cups' },
      { value: 'scoops', label: 'Scoops' }
    ]
  },
  Goat: {
    brands: [
      'Purina',
      'Nutrena',
      'Manna Pro',
      'ADM',
      'Chaffhaye',
      'Local Feed Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'hay', label: 'Hay (Alfalfa, Grass)' },
      { value: 'grain', label: 'Grain Mix' },
      { value: 'pellets', label: 'Pelleted Feed' },
      { value: 'browse', label: 'Browse/Pasture' },
      { value: 'minerals', label: 'Mineral Supplements' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'cups', label: 'Cups' },
      { value: 'flakes', label: 'Flakes (Hay)' }
    ]
  },
  Sheep: {
    brands: [
      'Purina',
      'Nutrena',
      'ADM',
      'Manna Pro',
      'Blue Seal',
      'Local Feed Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'hay', label: 'Hay (Grass, Alfalfa)' },
      { value: 'grain', label: 'Grain Mix' },
      { value: 'pellets', label: 'Pelleted Feed' },
      { value: 'pasture', label: 'Pasture Grazing' },
      { value: 'minerals', label: 'Mineral Supplements' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'cups', label: 'Cups' },
      { value: 'flakes', label: 'Flakes (Hay)' }
    ]
  },
  Chicken: {
    brands: [
      'Purina',
      'Nutrena',
      'Scratch and Peck',
      'Manna Pro',
      'Kalmbach',
      'Dumor',
      'Local Feed Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'layer', label: 'Layer Feed (Pellets/Crumbles)' },
      { value: 'grower', label: 'Grower Feed' },
      { value: 'starter', label: 'Starter Feed (Chicks)' },
      { value: 'scratch', label: 'Scratch Grains' },
      { value: 'treats', label: 'Treats/Vegetables' },
      { value: 'forage', label: 'Free Range/Forage' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'cups', label: 'Cups' },
      { value: 'scoops', label: 'Scoops' },
      { value: 'handfuls', label: 'Handfuls' }
    ]
  },
  Duck: {
    brands: [
      'Purina',
      'Mazuri',
      'Nutrena',
      'Manna Pro',
      'Scratch and Peck',
      'Local Feed Mill',
      'Other'
    ],
    foodTypes: [
      { value: 'pellets', label: 'Waterfowl Pellets' },
      { value: 'grower', label: 'Grower Feed' },
      { value: 'layer', label: 'Layer Feed' },
      { value: 'greens', label: 'Greens/Vegetables' },
      { value: 'forage', label: 'Forage/Pond Plants' }
    ],
    servingUnits: [
      { value: 'lbs', label: 'Pounds' },
      { value: 'cups', label: 'Cups' },
      { value: 'scoops', label: 'Scoops' }
    ]
  }
}

// Default options for unknown species
export const DEFAULT_PET_FOOD_OPTIONS: PetFoodOptions = {
  brands: ['Other'],
  foodTypes: [
    { value: 'commercial', label: 'Commercial Food' },
    { value: 'fresh', label: 'Fresh Food' },
    { value: 'mixed', label: 'Mixed Diet' }
  ],
  servingUnits: [
    { value: 'grams', label: 'Grams' },
    { value: 'oz', label: 'Ounces' },
    { value: 'cups', label: 'Cups' },
    { value: 'tbsp', label: 'Tablespoons' }
  ]
}

export function getPetFoodOptions(species?: string): PetFoodOptions {
  if (!species) return DEFAULT_PET_FOOD_OPTIONS
  return PET_FOOD_DATA[species] || DEFAULT_PET_FOOD_OPTIONS
}
