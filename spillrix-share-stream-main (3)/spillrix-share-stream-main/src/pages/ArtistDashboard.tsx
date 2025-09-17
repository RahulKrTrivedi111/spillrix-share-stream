import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/ui/Logo';
import { AudioPlayerWithUrl } from '@/components/audio/AudioPlayerWithUrl';
import { useToast } from '@/hooks/use-toast';
import { Upload, LogOut, Trash2, Music, Calendar, Clock, Edit } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { NewReleaseForm } from '@/components/forms/NewReleaseForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';

type Track = Omit<Tables<'tracks'>, 'deleted_at' | 'deleted_by'>;

export default function ArtistDashboard() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingTrack, setEditingTrack] = useState<Track | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchTracks = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('id, artist_id, title, genre, duration, upload_date, status, cover_art_url, music_file_url, upc_irsc, command')
        .eq('artist_id', profile.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      const enhancedTracks = data.map(track => {
        const coverArtPublicUrl = track.cover_art_url ? supabase.storage.from('cover-art').getPublicUrl(track.cover_art_url).data.publicUrl : '';
        return { ...track, cover_art_url: coverArtPublicUrl };
      });

      setTracks((enhancedTracks as Track[]) || []);
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

  useEffect(() => {
    if (profile?.id) {
      fetchTracks();
      
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

  const deleteTrack = async (trackId: string) => {
    try {
      // Get the track data to get the music_file_url and cover_art_url
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select('music_file_url, cover_art_url')
        .eq('id', trackId)
        .single();

      if (trackError) throw trackError;

      // Delete the track from storage
      const { error: storageError } = await supabase
        .storage
        .from('tracks')
        .remove([trackData.music_file_url, trackData.cover_art_url]);

      if (storageError) throw storageError;

      // Delete the track from the database
      const { error: dbError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (dbError) throw dbError;

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

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingTrack(undefined);
    fetchTracks();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="status-approved bg-green-500 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge className="status-pending bg-violet-500 text-white">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds)) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AuthGuard requireAuth>
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mobile-container py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
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
                Share your music with the world. Upload WAV files.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <DialogTrigger asChild>
                 <Button onClick={() => setEditingTrack(undefined)}>Create New Release</Button>
               </DialogTrigger>
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
                <div className="mobile-table">
                  <div className="mobile-table-content">
                    <Table className="min-w-[900px] lg:min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Cover Art</TableHead>
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
                          <TableCell>
                            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                              {track.cover_art_url ? (
                                <img 
                                  src={track.cover_art_url} 
                                  alt={`${track.title} cover`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Music className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{track.title}</TableCell>
                          <TableCell>{track.genre}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(durations[track.id] ?? track.duration)}
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
                            <AudioPlayerWithUrl 
                              filePath={track.music_file_url || ''}
                              title={track.title}
                              onDurationChange={(d) => setDurations(prev => ({...prev, [track.id]: d}))}
                              className="min-w-[250px] md:min-w-[200px]"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {track.status === 'rejected' && (
                                 <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingTrack(track)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                 </DialogTrigger>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTrack(track.id)}
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground touch-target"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
       <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrack ? "Edit Release" : "Create New Release"}</DialogTitle>
            <DialogDescription>
              {editingTrack ? 'Update the details for your track.' : 'Submit a new track for distribution. Please fill out all required fields.'}
            </DialogDescription>
          </DialogHeader>
          <NewReleaseForm track={editingTrack} onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
