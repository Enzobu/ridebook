export interface MapEmbedExtractor {
  extract(googleMapsUrl: string): Promise<string>;
}

export class FakeMapEmbedExtractor implements MapEmbedExtractor {
  constructor(private readonly embedUrl: string) {}

  async extract(_googleMapsUrl: string): Promise<string> {
    return this.embedUrl;
  }
}
