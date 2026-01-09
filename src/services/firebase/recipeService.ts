import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

export interface Recipe {
  id: string;
  productId: string;
  rawMaterialId: string;
  quantityPerUnit: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecipeWithMaterial extends Recipe {
  rawMaterial?: {
    id: string;
    name: string;
    unit: string;
    cost: number;
    stock: number;
  };
}

export interface RecipeWithProduct extends Recipe {
  product?: {
    id: string;
    name: string;
    sku?: string;
    unit?: string;
  };
}

const RECIPES_COLLECTION = "recipes";

/**
 * Get all recipes for a product
 */
export const getProductRecipes = async (productId: string): Promise<RecipeWithMaterial[]> => {
  try {
    const recipesRef = collection(db, RECIPES_COLLECTION);
    const q = query(recipesRef, where("productId", "==", productId));
    const snapshot = await getDocs(q);
    
    const recipes: RecipeWithMaterial[] = [];
    
    for (const docSnap of snapshot.docs) {
      const recipeData = docSnap.data() as Omit<Recipe, "id">;
      const recipe: RecipeWithMaterial = {
        id: docSnap.id,
        ...recipeData,
      };
      
      // Fetch raw material details
      if (recipe.rawMaterialId) {
        try {
          const materialDoc = await getDoc(doc(db, "raw_materials", recipe.rawMaterialId));
          if (materialDoc.exists()) {
            const materialData = materialDoc.data();
            // Silinmiş hammaddeleri atla - reçete listesine eklenmesin
            if (materialData.deleted === true || materialData.isDeleted === true) {
              continue; // Bu reçeteyi atla
            }
            recipe.rawMaterial = {
              id: materialDoc.id,
              name: materialData.name || "",
              unit: materialData.unit || "Adet",
              cost: materialData.cost || materialData.unitPrice || 0,
              stock: materialData.stock || materialData.currentStock || 0,
            } as RecipeWithMaterial["rawMaterial"];
          } else {
            // Hammadde bulunamadıysa (silinmişse), bu reçeteyi atla
            continue;
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching raw material:", error);
          }
          // Hata durumunda da bu reçeteyi atla
          continue;
        }
      } else {
        // rawMaterialId yoksa bu reçeteyi atla
        continue;
      }
      
      recipes.push(recipe);
    }
    
    return recipes;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting product recipes:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Reçeteler yüklenemedi");
  }
};

/**
 * Add a recipe item
 */
export const addRecipeItem = async (
  productId: string,
  rawMaterialId: string,
  quantityPerUnit: number
): Promise<string> => {
  try {
    const recipesRef = collection(db, RECIPES_COLLECTION);
    const newRecipe = {
      productId,
      rawMaterialId,
      quantityPerUnit,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(recipesRef, newRecipe);
    return docRef.id;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error adding recipe item:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Reçete eklenemedi");
  }
};

/**
 * Update a recipe item
 */
export const updateRecipeItem = async (
  recipeId: string,
  quantityPerUnit: number
): Promise<void> => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    await updateDoc(recipeRef, {
      quantityPerUnit,
      updatedAt: Timestamp.now(),
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error updating recipe item:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Reçete güncellenemedi");
  }
};

/**
 * Delete a recipe item
 */
export const deleteRecipeItem = async (recipeId: string): Promise<void> => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    await deleteDoc(recipeRef);
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error deleting recipe item:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Reçete silinemedi");
  }
};

/**
 * Get all recipes for a raw material (which products use this raw material)
 */
export const getRawMaterialRecipes = async (rawMaterialId: string): Promise<RecipeWithProduct[]> => {
  try {
    const recipesRef = collection(db, RECIPES_COLLECTION);
    const q = query(recipesRef, where("rawMaterialId", "==", rawMaterialId));
    const snapshot = await getDocs(q);
    
    const recipes: RecipeWithProduct[] = [];
    
    for (const docSnap of snapshot.docs) {
      const recipeData = docSnap.data() as Omit<Recipe, "id">;
      const recipe: RecipeWithProduct = {
        id: docSnap.id,
        ...recipeData,
      };
      
      // Fetch product details
      if (recipe.productId) {
        try {
          const productDoc = await getDoc(doc(db, "products", recipe.productId));
          if (productDoc.exists()) {
            recipe.product = {
              id: productDoc.id,
              ...productDoc.data(),
            } as RecipeWithProduct["product"];
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching product:", error);
          }
        }
      }
      
      recipes.push(recipe);
    }
    
    return recipes;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting raw material recipes:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Reçeteler yüklenemedi");
  }
};

