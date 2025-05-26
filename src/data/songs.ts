import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export interface Song {
  id: string;
  title: string;
  lyrics: string; // This will store base64 encoded lyrics
  categories: string[]; // Array of categories
}

// Use local variable for runtime data until we fetch from Firebase
let runtimeSongs: Song[] = [];
let runtimeCategories: string[] = [];

// Helper functions for data operations
export const loadSongs = async (): Promise<Song[]> => {

  
  try {
    const songsCollection = collection(db, 'songs');
    const songsSnapshot = await getDocs(songsCollection);
    const songsList = songsSnapshot.docs.map(doc => {
      const data = doc.data() as Song;
      return { ...data, id: doc.id };
    });
    
    // Update runtime cache
    runtimeSongs = songsList;
    return songsList;
  } catch (error) {
    console.error('Error loading songs from Firebase:', error);
    return runtimeSongs;
  }
};

// Function to initialize the database
export const seedDatabase = async (): Promise<void> => {
  try {
    // Check if songs already exist in the database
    const songsCollection = collection(db, 'songs');
    const songsSnapshot = await getDocs(songsCollection);
    
    if (songsSnapshot.empty) {
      console.log('Initializing database...');
      
      // Default categories for metadata
      const defaultCategories = ['vibe', 'melody', 'mash'];
      
      // Set available categories
      await setDoc(doc(db, 'metadata', 'categories'), {
        availableCategories: defaultCategories
      });
      
      console.log('Database initialized successfully');
    } else {
      console.log('Database already contains songs, skipping initialization');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

export const saveSongs = async (updatedSongs: Song[]): Promise<void> => {
  try {
    // Filter out any invalid or temporary songs before saving
    const validSongs = updatedSongs.filter(song => {
      // Validate song has required fields with actual content
      const hasTitle = song.title && song.title.trim().length > 0;
      const hasLyrics = song.lyrics && song.lyrics.length > 0;
      const hasValidId = song.id && !song.id.startsWith('temp_');
      
      return hasTitle && hasLyrics && hasValidId;
    });
    
    // Update runtime cache first for immediate UI updates
    runtimeSongs = [...validSongs];
    
    // Batch update Firestore - would be better to only update changed songs
    for (const song of validSongs) {
      await setDoc(doc(db, 'songs', song.id), song);
    }
    
    console.log(`Saved ${validSongs.length} valid songs to Firebase.`);
    
    // If some songs were filtered out as invalid, log a warning
    if (validSongs.length < updatedSongs.length) {
      console.warn(`Filtered out ${updatedSongs.length - validSongs.length} invalid songs.`);
    }
  } catch (error) {
    console.error('Error saving songs to Firebase:', error);
    throw error; // Re-throw to handle in UI
  }
};

// Function to delete a song from Firestore
export const deleteSong = async (songId: string): Promise<void> => {
  try {
    // Delete the song document from Firestore
    await deleteDoc(doc(db, 'songs', songId));
    console.log(`Song with ID ${songId} deleted successfully from Firestore`);
    
    // Update runtime cache
    runtimeSongs = runtimeSongs.filter(song => song.id !== songId);
  } catch (error) {
    console.error(`Error deleting song with ID ${songId}:`, error);
    throw error; // Rethrow to handle in UI
  }
};

export const loadCategories = async (): Promise<string[]> => {
  try {
    const categoriesDoc = await getDocs(collection(db, 'metadata'));
    let categories: string[] = [];
    
    // Look for the categories document
    categoriesDoc.forEach(doc => {
      if (doc.id === 'categories') {
        categories = doc.data().availableCategories || [];
      }
    });
    
    // If no categories document exists yet, create one with default categories
    if (categories.length === 0) {
      const defaultCategories = ['vibe', 'melody', 'mash'];
      await setDoc(doc(db, 'metadata', 'categories'), {
        availableCategories: defaultCategories
      });
      categories = defaultCategories;
    }
    
    // Update runtime cache
    runtimeCategories = categories;
    return categories;
  } catch (error) {
    console.error('Error loading categories from Firebase:', error);
    return runtimeCategories;
  }
};

export const saveCategories = async (updatedCategories: string[]): Promise<void> => {
  try {
    // Update runtime cache first for immediate UI updates
    runtimeCategories = [...updatedCategories];
    
    // Update in Firestore
    await setDoc(doc(db, 'metadata', 'categories'), {
      availableCategories: updatedCategories
    });
  } catch (error) {
    console.error('Error saving categories to Firebase:', error);
  }
};

// Function to check if a category is only used by one song
export const isCategoryOnlyUsedBy = (songId: string, category: string): boolean => {
  const songsWithCategory = runtimeSongs.filter(
    song => song.categories.includes(category) && song.id !== songId
  );
  return songsWithCategory.length === 0;
};

// Function to clean up unused categories
export const cleanupUnusedCategories = async (): Promise<void> => {
  try {
    const usedCategories = new Set<string>();
    
    // Collect all categories currently in use
    runtimeSongs.forEach(song => {
      song.categories.forEach(category => {
        usedCategories.add(category);
      });
    });
    
    // Update runtime categories to only include used ones
    runtimeCategories = Array.from(usedCategories);
    
    // Save to Firestore
    await saveCategories(runtimeCategories);
  } catch (error) {
    console.error('Error cleaning up categories in Firebase:', error);
  }
};
