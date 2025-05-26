
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SongSearch from '../components/SongSearch';
import SelectedSongs from '../components/SelectedSongs';
import PDFGenerator from '../components/PDFGenerator';
import TemplateSelector from '../components/TemplateSelector';
import FirebaseStatus from '../components/FirebaseStatus';
import DataLoader from '../components/DataLoader';
import { loadSongs, Song } from '../data/songs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const isMobile = useIsMobile();

  // Load songs on component mount
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const loadedSongs = await loadSongs();
        setSongs(loadedSongs);
      } catch (error) {
        console.error("Error loading songs:", error);
      }
    };
    
    fetchSongs();
  }, []);

  const handleSongSelect = (song: Song) => {
    // Check if song is already selected
    if (!selectedSongs.some(s => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleSongRemove = (songId: string) => {
    setSelectedSongs(selectedSongs.filter(song => song.id !== songId));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8 relative">
      <div className="max-w-md mx-auto w-full">
        <FirebaseStatus />
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            Lyrics Generator
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Search and select songs to generate a lyrics PDF
          </p>
        </div>
        
        <DataLoader>
          <SongSearch 
            songs={songs} 
            onSongSelect={handleSongSelect} 
            selectedSongs={selectedSongs}
          />
          
          <SelectedSongs 
            songs={selectedSongs} 
            onRemove={handleSongRemove} 
          />
          
          <PDFGenerator 
            selectedSongs={selectedSongs} 
          />
        </DataLoader>
      </div>
      
      {/* Floating Add Button */}
      <Link to="/manage-songs">
        <Button 
          size="icon" 
          className={`fixed ${isMobile ? 'bottom-4 right-4 h-12 w-12' : 'bottom-6 right-6 h-14 w-14'} rounded-full shadow-lg`}
          aria-label="Add Songs"
        >
          <Plus size={isMobile ? 20 : 24} />
        </Button>
      </Link>
      
      {/* Template Selector */}
      <TemplateSelector />
    </div>
  );
};

export default Index;
