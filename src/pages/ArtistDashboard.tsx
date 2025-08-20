import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { toast } from '@/hooks/use-toast';
import { Upload, LogOut, Trash2, Music, Calendar, Clock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  genre: string;
  music_file_url: string;
  cover_art_url?: string;
  duration?: number;
  status: 'pending' | 'approved' | 'rejected';
  upload_date: string;
}

const GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 
  'R&B', 'Country', 'Folk', 'Reggae', 'Blues', 'Punk', 'Metal', 'Other'
];

export default function ArtistDashboard() {
  const { profile, signOut } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchTracks();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('tracks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tracks',
            filter: `artist_id=eq.${profile.id}`
          },
          () => {
            fetchTracks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchTracks = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', profile.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setTracks((data as Track[]) || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tracks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('tracks')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data;
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('tracks')
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

    if (error) throw error;
    return data.signedUrl;
  };

  const detectDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => reject(new Error('Could not load audio'));
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicFile || !title || !genre) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields and select an audio file.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const musicPath = `${profile?.id}/${timestamp}-${musicFile.name}`;
      
      // Upload music file
      await uploadFile(musicFile, musicPath);
      const musicUrl = await getSignedUrl(musicPath);
      
      // Upload cover art if provided
      let coverUrl = null;
      if (coverArt) {
        const coverPath = `${profile?.id}/covers/${timestamp}-${coverArt.name}`;
        await uploadFile(coverArt, coverPath);
        coverUrl = await getSignedUrl(coverPath);
      }
      
      // Detect duration
      let duration = null;
      try {
        duration = await detectDuration(musicFile);
      } catch (error) {
        console.warn('Could not detect duration:', error);
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('tracks')
        .insert({
          title,
          genre,
          music_file_url: musicUrl,
          cover_art_url: coverUrl,
          duration,
          artist_id: profile?.id,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: 'Track Uploaded!',
        description: 'Your track has been uploaded and is pending approval.',
      });

      // Reset form
      setTitle('');
      setGenre('');
      setMusicFile(null);
      setCoverArt(null);
      const musicInput = document.getElementById('music-file') as HTMLInputElement;
      const coverInput = document.getElementById('cover-art') as HTMLInputElement;
      if (musicInput) musicInput.value = '';
      if (coverInput) coverInput.value = '';
      
      fetchTracks();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your track. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: 'Track Deleted',
        description: 'Track has been deleted successfully.',
      });
      
      fetchTracks();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete track. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="status-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected">Rejected</Badge>;
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mobile-container py-4 flex items-center justify-between">
            <Logo size="md" />
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden sm:inline text-sm text-muted-foreground">Welcome, {profile?.name}</span>
              <Button variant="outline" onClick={signOut} size="sm" className="touch-target">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="mobile-container py-6 md:py-8 space-y-6 md:space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">Welcome, {profile?.name}!</h1>
            <p className="text-muted-foreground mobile-text">Upload and manage your music tracks</p>
          </div>

          {/* Upload Section */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Track
              </CardTitle>
              <CardDescription>
                Share your music with the world. Upload MP3 or WAV files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="mobile-stack">
                  <div className="space-y-2">
                    <Label htmlFor="title">Track Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter track title"
                      required
                      className="input-modern"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre *</Label>
                    <Select value={genre} onValueChange={setGenre} required>
                      <SelectTrigger className="input-modern">
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mobile-stack">
                  <div className="space-y-2">
                    <Label htmlFor="music-file">Audio File * (MP3/WAV)</Label>
                    <Input
                      id="music-file"
                      type="file"
                      accept=".mp3,.wav"
                      onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                      required
                      className="input-modern"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cover-art">Cover Art (Optional)</Label>
                    <Input
                      id="cover-art"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(e) => setCoverArt(e.target.files?.[0] || null)}
                      className="input-modern"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={uploading} className="btn-primary w-full sm:w-auto">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Track
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tracks List */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                My Tracks ({tracks.length})
              </CardTitle>
              <CardDescription>
                Manage your uploaded tracks and view their approval status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tracks uploaded yet</p>
                  <p className="text-sm">Upload your first track to get started!</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-[800px] sm:min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Genre</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tracks.map((track) => (
                        <TableRow key={track.id}>
                          <TableCell className="font-medium">{track.title}</TableCell>
                          <TableCell>{track.genre}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(track.duration)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(track.upload_date)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(track.status)}</TableCell>
                          <TableCell>
                            <AudioPlayer 
                              src={track.music_file_url}
                              title={track.title}
                              className="min-w-[250px] md:min-w-[200px]"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTrack(track.id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}