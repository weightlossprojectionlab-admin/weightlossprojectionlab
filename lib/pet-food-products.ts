/**
 * Pet Food Brand-to-Product Mappings
 * Maps popular brands to their common product lines by species
 */

export interface BrandProductMap {
  [brand: string]: string[]
}

export const PET_FOOD_PRODUCTS: Record<string, BrandProductMap> = {
  Dog: {
    'Purina': [
      'Pro Plan Adult Chicken & Rice',
      'Pro Plan Sensitive Stomach',
      'Pro Plan Sport',
      'Puppy Chow',
      'Dog Chow',
      'Beneful',
      'ONE SmartBlend'
    ],
    'Blue Buffalo': [
      'Life Protection Adult Chicken',
      'Wilderness Chicken',
      'Freedom Grain-Free',
      'Basics Limited Ingredient',
      'Puppy Chicken & Brown Rice'
    ],
    'Hill\'s Science Diet': [
      'Adult Large Breed',
      'Adult Small Paws',
      'Sensitive Stomach & Skin',
      'Puppy',
      'Senior'
    ],
    'Royal Canin': [
      'Size Health Nutrition',
      'Breed Health Nutrition',
      'Veterinary Diet',
      'Puppy',
      'Adult'
    ]
  },
  Cat: {
    'Purina': [
      'Pro Plan Adult Chicken & Rice',
      'Fancy Feast Classic',
      'Friskies',
      'Cat Chow',
      'ONE Indoor Advantage'
    ],
    'Blue Buffalo': [
      'Wilderness Indoor Chicken',
      'Freedom Grain-Free',
      'Tastefuls',
      'Healthy Gourmet'
    ],
    'Hill\'s Science Diet': [
      'Adult Indoor',
      'Adult Oral Care',
      'Kitten',
      'Senior'
    ],
    'Royal Canin': [
      'Indoor Adult',
      'Feline Health Nutrition',
      'Breed Health Nutrition',
      'Kitten'
    ]
  },
  'Guinea Pig': {
    'Oxbow': [
      'Essentials Adult Guinea Pig Food',
      'Cavy Cuisine',
      'Timothy Hay',
      'Alfalfa Hay',
      'Western Timothy Hay'
    ],
    'Small Pet Select': [
      'Guinea Pig Food Pellets',
      'Timothy Hay',
      'Orchard Grass Hay'
    ],
    'Kaytee': [
      'Forti-Diet Pro Health',
      'Timothy Complete',
      'Natural Timothy Hay'
    ]
  },
  Rabbit: {
    'Oxbow': [
      'Essentials Adult Rabbit Food',
      'Garden Select',
      'Timothy Hay',
      'Alfalfa Hay'
    ],
    'Small Pet Select': [
      'Rabbit Food Pellets',
      'Timothy Hay',
      'Orchard Grass Hay'
    ],
    'Sherwood': [
      'Adult Rabbit Food',
      'Timothy Hay'
    ]
  },
  Horse: {
    'Purina': [
      'Strategy GX',
      'Senior',
      'Ultium Competition',
      'Omolene',
      'Strategy Healthy Edge'
    ],
    'Triple Crown': [
      'Senior',
      'Low Starch',
      'Complete',
      'Growth',
      'Lite'
    ],
    'Nutrena': [
      'SafeChoice',
      'ProForce',
      'Empower Balance',
      'Senior'
    ]
  },
  Chicken: {
    'Purina': [
      'Layena',
      'Layena Plus',
      'Flock Raiser',
      'Start & Grow',
      'Scratch Grains'
    ],
    'Nutrena': [
      'NatureWise Layer',
      'NatureWise Chick',
      'Country Feeds Layer',
      'Scratch Grains'
    ],
    'Manna Pro': [
      'Organic Layer Pellets',
      'Chick Starter',
      'Oyster Shell',
      'Scratch Grains'
    ]
  },
  Goat: {
    'Purina': [
      'Goat Chow',
      'Noble Goat',
      'Goat Mineral'
    ],
    'Manna Pro': [
      'Goat Mineral',
      'Goat Balancer',
      'ShowRite'
    ],
    'Nutrena': [
      'Naturewise Goat',
      'Goat Mineral'
    ]
  },
  Cow: {
    'Purina': [
      'Accuration',
      'Wind and Rain Mineral',
      'Range Mineral',
      'Cattle Chow'
    ],
    'ADM': [
      'Pen Pals',
      'StandUp',
      'MegaLic'
    ],
    'Land O\'Lakes': [
      'Ani-Minerals',
      'Cow-Cal',
      'Respond'
    ]
  },
  Pig: {
    'Purina': [
      'Pig Grower',
      'Pig Finisher',
      'Pig Starter'
    ],
    'Nutrena': [
      'Country Feeds Pig Grower',
      'ShowRite',
      'Starter'
    ],
    'Mazuri': [
      'Mini Pig Active Adult',
      'Mini Pig Elder'
    ]
  },
  Sheep: {
    'Purina': [
      'Sheep Mineral',
      'Accuration Sheep',
      'Lamb & Ewe'
    ],
    'Nutrena': [
      'NatureWise Sheep',
      'Sheep Mineral'
    ],
    'Manna Pro': [
      'Sheep Mineral',
      'Show Lamb'
    ]
  }
}

/**
 * Get products for a specific brand and species
 */
export function getBrandProducts(species?: string, brand?: string): string[] {
  if (!species || !brand) return []

  const speciesProducts = PET_FOOD_PRODUCTS[species]
  if (!speciesProducts) return []

  return speciesProducts[brand] || []
}

/**
 * Check if a species has brand-product mappings
 */
export function hasProductMappings(species?: string): boolean {
  if (!species) return false
  return !!PET_FOOD_PRODUCTS[species]
}

/**
 * Check if a brand has product mappings for a species
 */
export function brandHasProducts(species?: string, brand?: string): boolean {
  if (!species || !brand) return false

  const speciesProducts = PET_FOOD_PRODUCTS[species]
  if (!speciesProducts) return false

  return !!speciesProducts[brand] && speciesProducts[brand].length > 0
}
