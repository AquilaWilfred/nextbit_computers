// Mock database client for settings
// In a real implementation, this would connect to your database

interface Setting {
  key: string;
  value: any;
}

class MockSettingModel {
  private settings: Map<string, Setting> = new Map();

  async findUnique({ where }: { where: { key: string } }): Promise<Setting | null> {
    return this.settings.get(where.key) || null;
  }

  async upsert({
    where,
    create,
    update,
  }: {
    where: { key: string };
    create: Setting;
    update: Partial<Setting>;
  }): Promise<Setting> {
    const existing = this.settings.get(where.key);
    if (existing) {
      const updated = { ...existing, ...update };
      this.settings.set(where.key, updated);
      return updated;
    } else {
      this.settings.set(create.key, create);
      return create;
    }
  }
}

export const db = {
  setting: new MockSettingModel(),
};