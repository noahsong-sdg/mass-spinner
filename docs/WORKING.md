# Working on Mass Spinner

Use the current Node release required by package.json. Use the existing CI commands.

Start new changes from main after the current integration merge.
Keep each change focused on one result.
Preserve existing scientific records in their current locations.

For a scientific calculation, save the inputs, units, solver version, data version, and comparison result.
Use the existing release manifest. Add a short note with passed checks and known limits.
Do not add a separate registry or move repository folders for this purpose.

Use existing physics software where possible. First reproduce one supplied example.
Then connect its output to the app with a small file interface.
Check transferred units and total power before showing quantitative results.

SALAMANDER is the first candidate for coupled neutron transport and heat conduction.
Use its CAD workflow example at the tested main revision before changing geometry or material inputs.
Keep the external installation separate from this repository.
