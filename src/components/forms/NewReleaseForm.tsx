import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  genre: z.string().min(2, { message: "Genre must be at least 2 characters." }),
  upc_irsc: z.string().optional(),
  music_file: z.any()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files?.[0]?.type === "audio/wav",
      { message: "Music file must be a WAV file." }
    ),
  cover_art: z.any().optional(),
});

interface NewReleaseFormProps {
  track?: Tables<"tracks">;
  onSuccess?: () => void;
}

export function NewReleaseForm({ track, onSuccess }: NewReleaseFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: track?.title || "",
      genre: track?.genre || "",
      upc_irsc: track?.upc_irsc || "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      const { title, genre, upc_irsc, music_file, cover_art } = data;

      const musicFile = music_file?.[0];

      if (track && !upc_irsc) {
        toast({ title: "Error", description: "UPC/IRSC is required for updates." });
        return;
      }

      if (!track && !musicFile) {
        form.setError("music_file", { type: "manual", message: "A music file is required for a new release." });
        return;
      }

      const coverArtFile = cover_art?.[0];

      const user = await supabase.auth.getUser();
      const artistId = user?.data?.user?.id;

      if (!artistId) {
        toast({ title: "Error", description: "You must be logged in to create a release." });
        return;
      }

      let music_file_path = track?.music_file_url;
      if (musicFile) {
        const { data: musicUploadData, error: musicUploadError } = await supabase.storage
          .from("music-files")
          .upload(`${artistId}/${musicFile.name}`, musicFile, { upsert: true });
        if (musicUploadError) throw musicUploadError;
        music_file_path = musicUploadData?.path;
      }

      let cover_art_path = track?.cover_art_url;
      if (coverArtFile) {
        const { data: coverArtUploadData, error: coverArtUploadError } = await supabase.storage
          .from("cover-art")
          .upload(`${artistId}/${coverArtFile.name}`, coverArtFile, { upsert: true });
        if (coverArtUploadError) throw coverArtUploadError;
        cover_art_path = coverArtUploadData?.path;
      }

      const upsertData = {
        title,
        genre,
        upc_irsc: upc_irsc || null,
        status: track ? track.status : "pending",
        music_file_url: music_file_path || null,
        cover_art_url: cover_art_path || null,
        artist_id: artistId, // Fix: Add missing artist_id
      };

      if (track) {
        const { error } = await supabase
          .from("tracks")
          .update(upsertData)
          .eq("id", track.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tracks").insert([upsertData]);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Release submitted successfully." });
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Song" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Genre</FormLabel>
              <FormControl>
                <Input placeholder="Pop" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="upc_irsc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UPC/IRSC (Optional for new releases)</FormLabel>
              <FormControl>
                <Input placeholder="123456789012" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="music_file"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Music File (WAV 16-bit 44.1 kHz)</FormLabel>
              <FormControl>
                <Input type="file" accept="audio/wav" onChange={(e) => onChange(e.target.files)} {...rest} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cover_art"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Cover Art</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{track ? "Update Release" : "Create Release"}</Button>
      </form>
    </Form>
  );
}
