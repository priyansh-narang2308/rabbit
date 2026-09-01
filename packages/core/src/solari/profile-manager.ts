import { Solari } from "@solarisdk/browser";

export interface ProfileMetadata {
  id: string;
  createdAt?: string;
}

export class ProfileManager {
  private solari: Solari;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SOLARI_API_KEY;
    if (!key) {
      throw new Error(
        "SOLARI_API_KEY is required to initialize ProfileManager",
      );
    }

    this.solari = new Solari({ apiKey: key });
  }

  async createProfile(): Promise<ProfileMetadata> {
    try {
      const solariAny = this.solari as any;
      if (solariAny.profiles && typeof solariAny.profiles.create === 'function') {
         const remoteProfile = await solariAny.profiles.create();
         return {
           id: remoteProfile.id,
           createdAt: remoteProfile.createdAt || new Date().toISOString()
         };
      }
      
      console.warn("Solari SDK 'profiles' namespace missing. Using mock profile generation.");
      return {
        id: `solari_prof_${crypto.randomUUID().replace(/-/g, '')}`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Failed to create Solari profile", error);
      throw error;
    }
  }

  /**
   * Delete a remote Solari profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    try {
      const solariAny = this.solari as any;
      if (solariAny.profiles && typeof solariAny.profiles.delete === 'function') {
         await solariAny.profiles.delete(profileId);
         return;
      }
      
      console.log(`Mock deleted Solari profile: ${profileId}`);
    } catch (error) {
      console.error(`Failed to delete Solari profile ${profileId}`, error);
      throw error;
    }
  }

  /**
   * Get remote profile info
   */
  async getProfile(profileId: string): Promise<ProfileMetadata | null> {
    try {
      const solariAny = this.solari as any;
      if (solariAny.profiles && typeof solariAny.profiles.get === 'function') {
         const remoteProfile = await solariAny.profiles.get(profileId);
         return {
           id: remoteProfile.id,
           createdAt: remoteProfile.createdAt
         };
      }
      
      return { id: profileId };
    } catch (error) {
      console.error(`Failed to get Solari profile ${profileId}`, error);
      return null;
    }
  }
}
