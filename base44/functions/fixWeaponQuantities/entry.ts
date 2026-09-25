import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const allInventories = await base44.asServiceRole.entities.PlayerInventory.list();

        let fixedCount = 0;
        let playersFixed = 0;

        for (const inventory of allInventories) {
            if (!inventory.weapons || typeof inventory.weapons !== 'object') continue;

            const updatedWeapons = { ...inventory.weapons };
            let changed = false;

            for (const [weaponId, qty] of Object.entries(updatedWeapons)) {
                if (qty > 1) {
                    updatedWeapons[weaponId] = 1;
                    fixedCount++;
                    changed = true;
                }
            }

            if (changed) {
                await base44.asServiceRole.entities.PlayerInventory.update(inventory.id, {
                    weapons: updatedWeapons
                });
                playersFixed++;
            }
        }

        return Response.json({
            success: true,
            playersFixed,
            weaponStacksReduced: fixedCount,
            message: `Fixed ${fixedCount} weapon stacks across ${playersFixed} players.`
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});