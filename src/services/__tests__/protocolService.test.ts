import { protocolService } from '../protocolService';

describe.skip('protocolService', () => {
  it('should return a non-empty array of templates', () => {
    const context = { config: {}, logger: console };
    const templates = protocolService.getProtocolTemplates(context);
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    // Check that each template has required fields
    templates.forEach(t => {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('required_params');
      expect(Array.isArray(t.required_params)).toBe(true);
    });
  });

  it('should return the correct template details for an existing id', () => {
    const context = { config: {}, logger: console };
    const templates = protocolService.getProtocolTemplates(context);
    const first = templates[0];
    const detail = protocolService.getTemplateDetails(first.id, context);
    expect(detail).toBeDefined();
    expect(detail?.id).toBe(first.id);
    expect(detail?.name).toBe(first.name);
  });

  it('should return undefined for a non-existent template id', () => {
    const context = { config: {}, logger: console };
    const detail = protocolService.getTemplateDetails('nonexistent-id', context);
    expect(detail).toBeUndefined();
  });
}); 