-- Allow deleting conversation transcripts
CREATE POLICY "Allow public delete" 
ON public.conversation_transcripts 
FOR DELETE 
USING (true);