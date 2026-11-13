
#include <algorithm>
#include <cmath>
#include <iostream>
#include <iomanip>
#include <utility>
using G4double=double; using G4float=float; using G4int=int;
constexpr double keV=1,protonMassAMU=1;
double G4Exp(double x){return std::exp(x);} double G4Log(double x){return std::log(x);}
int G4lrint(double x){return std::lrint(x);}
struct Pow{double Z13(int z){return std::cbrt(z);}};
struct G4RandGauss{static double shoot(double a,double){return a;}};
struct G4BraggModel{double ElectronicStoppingPower(double,double)const;};
struct G4ICRU49NuclearStoppingModel{
 double Z23[100]={}; Pow object; Pow* g4calc=&object; bool lossFlucFlag=false;
 double NuclearStoppingPower(double,double,double,double,double);
};
G4double G4BraggModel::ElectronicStoppingPower(G4double z,
                                               G4double kineticEnergy) const
{
  G4double ionloss ;
  G4int i = std::min(std::max(G4lrint(z)-1,0),91);  // index of atom

  // The data and the fit from: 
  // ICRU Report 49, 1993. Ziegler's type of parametrisations.
  // Proton kinetic energy for parametrisation (keV/amu)  

  G4double T = kineticEnergy/(keV*protonMassAMU) ; 
  
  static const G4float a[92][5] = {
   {1.254E+0f, 1.440E+0f, 2.426E+2f, 1.200E+4f, 1.159E-1f},
   {1.229E+0f, 1.397E+0f, 4.845E+2f, 5.873E+3f, 5.225E-2f},
   {1.411E+0f, 1.600E+0f, 7.256E+2f, 3.013E+3f, 4.578E-2f},
   {2.248E+0f, 2.590E+0f, 9.660E+2f, 1.538E+2f, 3.475E-2f},
   {2.474E+0f, 2.815E+0f, 1.206E+3f, 1.060E+3f, 2.855E-2f},
   {2.631E+0f, 2.601E+0f, 1.701E+3f, 1.279E+3f, 1.638E-2f},
   {2.954E+0f, 3.350E+0f, 1.683E+3f, 1.900E+3f, 2.513E-2f},
   {2.652E+0f, 3.000E+0f, 1.920E+3f, 2.000E+3f, 2.230E-2f},
   {2.085E+0f, 2.352E+0f, 2.157E+3f, 2.634E+3f, 1.816E-2f},
   {1.951E+0f, 2.199E+0f, 2.393E+3f, 2.699E+3f, 1.568E-2f},
       // Z= 11-20
   {2.542E+0f, 2.869E+0f, 2.628E+3f, 1.854E+3f, 1.472E-2f},
   {3.791E+0f, 4.293E+0f, 2.862E+3f, 1.009E+3f, 1.397E-2f},
   {4.154E+0f, 4.739E+0f, 2.766E+3f, 1.645E+2f, 2.023E-2f},
   {4.914E+0f, 5.598E+0f, 3.193E+3f, 2.327E+2f, 1.419E-2f},
   {3.232E+0f, 3.647E+0f, 3.561E+3f, 1.560E+3f, 1.267E-2f},
   {3.447E+0f, 3.891E+0f, 3.792E+3f, 1.219E+3f, 1.211E-2f},
   {5.301E+0f, 6.008E+0f, 3.969E+3f, 6.451E+2f, 1.183E-2f},
   {5.731E+0f, 6.500E+0f, 4.253E+3f, 5.300E+2f, 1.123E-2f},
   {5.152E+0f, 5.833E+0f, 4.482E+3f, 5.457E+2f, 1.129E-2f},
   {5.521E+0f, 6.252E+0f, 4.710E+3f, 5.533E+2f, 1.112E-2f},
       // Z= 21-30
   {5.201E+0f, 5.884E+0f, 4.938E+3f, 5.609E+2f, 9.995E-3f},
   {4.858E+0f, 5.489E+0f, 5.260E+3f, 6.511E+2f, 8.930E-3f},
   {4.479E+0f, 5.055E+0f, 5.391E+3f, 9.523E+2f, 9.117E-3f},
   {3.983E+0f, 4.489E+0f, 5.616E+3f, 1.336E+3f, 8.413E-3f},
   {3.469E+0f, 3.907E+0f, 5.725E+3f, 1.461E+3f, 8.829E-3f},
   {3.519E+0f, 3.963E+0f, 6.065E+3f, 1.243E+3f, 7.782E-3f},
   {3.140E+0f, 3.535E+0f, 6.288E+3f, 1.372E+3f, 7.361E-3f},
   {3.553E+0f, 4.004E+0f, 6.205E+3f, 5.551E+2f, 8.763E-3f},
   {3.696E+0f, 4.194E+0f, 4.649E+3f, 8.113E+1f, 2.242E-2f},
   {4.210E+0f, 4.750E+0f, 6.953E+3f, 2.952E+2f, 6.809E-3f},
       // Z= 31-40
   {5.041E+0f, 5.697E+0f, 7.173E+3f, 2.026E+2f, 6.725E-3f},
   {5.554E+0f, 6.300E+0f, 6.496E+3f, 1.100E+2f, 9.689E-3f},
   {5.323E+0f, 6.012E+0f, 7.611E+3f, 2.925E+2f, 6.447E-3f},
   {5.874E+0f, 6.656E+0f, 7.395E+3f, 1.175E+2f, 7.684E-3f},
   {6.658E+0f, 7.536E+0f, 7.694E+3f, 2.223E+2f, 6.509E-3f},
   {6.413E+0f, 7.240E+0f, 1.185E+4f, 1.537E+2f, 2.880E-3f},
   {5.694E+0f, 6.429E+0f, 8.478E+3f, 2.929E+2f, 6.087E-3f},
   {6.339E+0f, 7.159E+0f, 8.693E+3f, 3.303E+2f, 6.003E-3f},
   {6.407E+0f, 7.234E+0f, 8.907E+3f, 3.678E+2f, 5.889E-3f},
   {6.734E+0f, 7.603E+0f, 9.120E+3f, 4.052E+2f, 5.765E-3f},
       // Z= 41-50
   {6.901E+0f, 7.791E+0f, 9.333E+3f, 4.427E+2f, 5.587E-3f},
   {6.424E+0f, 7.248E+0f, 9.545E+3f, 4.802E+2f, 5.376E-3f},
   {6.799E+0f, 7.671E+0f, 9.756E+3f, 5.176E+2f, 5.315E-3f},
   {6.109E+0f, 6.887E+0f, 9.966E+3f, 5.551E+2f, 5.151E-3f},
   {5.924E+0f, 6.677E+0f, 1.018E+4f, 5.925E+2f, 4.919E-3f},
   {5.238E+0f, 5.900E+0f, 1.038E+4f, 6.300E+2f, 4.758E-3f},
   // {5.623f,    6.354f,    7160.0f,   337.6f,    0.013940f}, // Ag Ziegler77
   {5.345E+0f, 6.038E+0f, 6.790E+3f, 3.978E+2f, 1.676E-2f}, // Ag ICRU49
   {5.814E+0f, 6.554E+0f, 1.080E+4f, 3.555E+2f, 4.626E-3f},
   {6.229E+0f, 7.024E+0f, 1.101E+4f, 3.709E+2f, 4.540E-3f},
   {6.409E+0f, 7.227E+0f, 1.121E+4f, 3.864E+2f, 4.474E-3f},
       // Z= 51-60
   {7.500E+0f, 8.480E+0f, 8.608E+3f, 3.480E+2f, 9.074E-3f},
   {6.979E+0f, 7.871E+0f, 1.162E+4f, 3.924E+2f, 4.402E-3f},
   {7.725E+0f, 8.716E+0f, 1.183E+4f, 3.948E+2f, 4.376E-3f},
   {8.337E+0f, 9.425E+0f, 1.051E+4f, 2.696E+2f, 6.206E-3f},
   {7.287E+0f, 8.218E+0f, 1.223E+4f, 3.997E+2f, 4.447E-3f},
   {7.899E+0f, 8.911E+0f, 1.243E+4f, 4.021E+2f, 4.511E-3f},
   {8.041E+0f, 9.071E+0f, 1.263E+4f, 4.045E+2f, 4.540E-3f},
   {7.488E+0f, 8.444E+0f, 1.283E+4f, 4.069E+2f, 4.420E-3f},
   {7.291E+0f, 8.219E+0f, 1.303E+4f, 4.093E+2f, 4.298E-3f},
   {7.098E+0f, 8.000E+0f, 1.323E+4f, 4.118E+2f, 4.182E-3f},
       // Z= 61-70
   {6.909E+0f, 7.786E+0f, 1.343E+4f, 4.142E+2f, 4.058E-3f},
   {6.728E+0f, 7.580E+0f, 1.362E+4f, 4.166E+2f, 3.976E-3f},
   {6.551E+0f, 7.380E+0f, 1.382E+4f, 4.190E+2f, 3.877E-3f},
   {6.739E+0f, 7.592E+0f, 1.402E+4f, 4.214E+2f, 3.863E-3f},
   {6.212E+0f, 6.996E+0f, 1.421E+4f, 4.239E+2f, 3.725E-3f},
   {5.517E+0f, 6.210E+0f, 1.440E+4f, 4.263E+2f, 3.632E-3f},
   {5.220E+0f, 5.874E+0f, 1.460E+4f, 4.287E+2f, 3.498E-3f},
   {5.071E+0f, 5.706E+0f, 1.479E+4f, 4.330E+2f, 3.405E-3f},
   {4.926E+0f, 5.542E+0f, 1.498E+4f, 4.335E+2f, 3.342E-3f},
   {4.788E+0f, 5.386E+0f, 1.517E+4f, 4.359E+2f, 3.292E-3f},
       // Z= 71-80
   {4.893E+0f, 5.505E+0f, 1.536E+4f, 4.384E+2f, 3.243E-3f},
   {5.028E+0f, 5.657E+0f, 1.555E+4f, 4.408E+2f, 3.195E-3f},
   {4.738E+0f, 5.329E+0f, 1.574E+4f, 4.432E+2f, 3.186E-3f},
   {4.587E+0f, 5.160E+0f, 1.541E+4f, 4.153E+2f, 3.406E-3f},
   {5.201E+0f, 5.851E+0f, 1.612E+4f, 4.416E+2f, 3.122E-3f},
   {5.071E+0f, 5.704E+0f, 1.630E+4f, 4.409E+2f, 3.082E-3f},
   {4.946E+0f, 5.563E+0f, 1.649E+4f, 4.401E+2f, 2.965E-3f},
   {4.477E+0f, 5.034E+0f, 1.667E+4f, 4.393E+2f, 2.871E-3f},
   //  {4.856f,    5.460f,    18320.0f,  438.5f,    0.002542f}, //Ziegler77
   {4.844E+0f, 5.458E+0f, 7.852E+3f, 9.758E+2f, 2.077E-2f}, //ICRU49
   {4.307E+0f, 4.843E+0f, 1.704E+4f, 4.878E+2f, 2.882E-3f},
       // Z= 81-90
   {4.723E+0f, 5.311E+0f, 1.722E+4f, 5.370E+2f, 2.913E-3f},
   {5.319E+0f, 5.982E+0f, 1.740E+4f, 5.863E+2f, 2.871E-3f},
   {5.956E+0f, 6.700E+0f, 1.780E+4f, 6.770E+2f, 2.660E-3f},
   {6.158E+0f, 6.928E+0f, 1.777E+4f, 5.863E+2f, 2.812E-3f},
   {6.203E+0f, 6.979E+0f, 1.795E+4f, 5.863E+2f, 2.776E-3f},
   {6.181E+0f, 6.954E+0f, 1.812E+4f, 5.863E+2f, 2.748E-3f},
   {6.949E+0f, 7.820E+0f, 1.830E+4f, 5.863E+2f, 2.737E-3f},
   {7.506E+0f, 8.448E+0f, 1.848E+4f, 5.863E+2f, 2.727E-3f},
   {7.648E+0f, 8.609E+0f, 1.866E+4f, 5.863E+2f, 2.697E-3f},
   {7.711E+0f, 8.679E+0f, 1.883E+4f, 5.863E+2f, 2.641E-3f},
       // Z= 91-92
   {7.407E+0f, 8.336E+0f, 1.901E+4f, 5.863E+2f, 2.603E-3f},
   {7.290E+0f, 8.204E+0f, 1.918E+4f, 5.863E+2f, 2.673E-3f}
  };

  G4double fac = 1.0 ;

    // Carbon specific case for E < 40 keV
  if ( T < 40.0 && 5 == i) {
    fac = std::sqrt(T*0.025);
    T = 40.0;  

    // Free electron gas model
  } else if ( T < 10.0 ) { 
    fac = std::sqrt(T*0.1) ;
    T = 10.0;
  }

  // Main parametrisation
  G4double x1 = (G4double)(a[i][1]);
  G4double x2 = (G4double)(a[i][2]);
  G4double x3 = (G4double)(a[i][3]);
  G4double x4 = (G4double)(a[i][4]);
  G4double slow  = x1 * G4Exp(G4Log(T) * 0.45);
  G4double shigh = G4Log( 1.0 + x3/T + x4*T ) * x2/T;
  ionloss = slow*shigh*fac / (slow + shigh);
  
  ionloss = std::max(ionloss, 0.0);
  
  return ionloss;
}
G4double G4ICRU49NuclearStoppingModel::NuclearStoppingPower(G4double kineticEnergy,
						   G4double z1, G4double z2,
						   G4double mass1, G4double mass2)
{
  G4double energy = kineticEnergy/keV ;  // energy in keV
  G4double nloss = 0.0;
  G4double z12 = z1*z2;
  G4int iz1 = std::min(99, G4lrint(z1));
  G4int iz2 = std::min(99, G4lrint(z2));
  
  G4double rm;
  if(z1 > 1.5) { 
    rm = (mass1 + mass2)*(Z23[iz1] + Z23[iz2]); 
  } else { 
    rm = (mass1 + mass2)*g4calc->Z13(G4lrint(z2)); 
  }
  G4double er = 32.536 * mass2 * energy / ( z12 * rm ) ;  // reduced energy
  /*
  G4cout << "   z1= " << iz1 << " z2= " << iz2 << " mass1= " << mass1
	 << " mass2= " << mass2 << " er= " << er << G4endl;
  */
  static const G4double nuca[104][2] = {
  { 1.0E+8, 5.831E-8},
  { 8.0E+7, 7.288E-8},
  { 6.0E+7, 9.719E-8},
  { 5.0E+7, 1.166E-7},
  { 4.0E+7, 1.457E-7},
  { 3.0E+7, 1.942E-7},
  { 2.0E+7, 2.916E-7},
  { 1.5E+7, 3.887E-7},

  { 1.0E+7, 5.833E-7},
  { 8.0E+6, 7.287E-7},
  { 6.0E+6, 9.712E-7},
  { 5.0E+6, 1.166E-6},
  { 4.0E+6, 1.457E-6},
  { 3.0E+6, 1.941E-6},
  { 2.0E+6, 2.911E-6},
  { 1.5E+6, 3.878E-6},

  { 1.0E+6, 5.810E-6},
  { 8.0E+5, 7.262E-6},
  { 6.0E+5, 9.663E-6},
  { 5.0E+5, 1.157E-5},
  { 4.0E+5, 1.442E-5},
  { 3.0E+5, 1.913E-5},
  { 2.0E+5, 2.845E-5},
  { 1.5E+5, 3.762E-5},

  { 1.0E+5, 5.554E-5},
  { 8.0E+4, 6.866E-5},
  { 6.0E+4, 9.020E-5},
  { 5.0E+4, 1.070E-4},
  { 4.0E+4, 1.319E-4},
  { 3.0E+4, 1.722E-4},
  { 2.0E+4, 2.499E-4},
  { 1.5E+4, 3.248E-4},

  { 1.0E+4, 4.688E-4},
  { 8.0E+3, 5.729E-4},
  { 6.0E+3, 7.411E-4},
  { 5.0E+3, 8.718E-4},
  { 4.0E+3, 1.063E-3},
  { 3.0E+3, 1.370E-3},
  { 2.0E+3, 1.955E-3},
  { 1.5E+3, 2.511E-3},

  { 1.0E+3, 3.563E-3},
  { 8.0E+2, 4.314E-3},
  { 6.0E+2, 5.511E-3},
  { 5.0E+2, 6.430E-3},
  { 4.0E+2, 7.756E-3},
  { 3.0E+2, 9.855E-3},
  { 2.0E+2, 1.375E-2},
  { 1.5E+2, 1.736E-2},

  { 1.0E+2, 2.395E-2},
  { 8.0E+1, 2.850E-2},
  { 6.0E+1, 3.552E-2},
  { 5.0E+1, 4.073E-2},
  { 4.0E+1, 4.802E-2},
  { 3.0E+1, 5.904E-2},
  { 1.5E+1, 9.426E-2},

  { 1.0E+1, 1.210E-1},
  { 8.0E+0, 1.377E-1},
  { 6.0E+0, 1.611E-1},
  { 5.0E+0, 1.768E-1},
  { 4.0E+0, 1.968E-1},
  { 3.0E+0, 2.235E-1},
  { 2.0E+0, 2.613E-1},
  { 1.5E+0, 2.871E-1},

  { 1.0E+0, 3.199E-1},
  { 8.0E-1, 3.354E-1},
  { 6.0E-1, 3.523E-1},
  { 5.0E-1, 3.609E-1},
  { 4.0E-1, 3.693E-1},
  { 3.0E-1, 3.766E-1},
  { 2.0E-1, 3.803E-1},
  { 1.5E-1, 3.788E-1},

  { 1.0E-1, 3.711E-1},
  { 8.0E-2, 3.644E-1},
  { 6.0E-2, 3.530E-1},
  { 5.0E-2, 3.444E-1},
  { 4.0E-2, 3.323E-1},
  { 3.0E-2, 3.144E-1},
  { 2.0E-2, 2.854E-1},
  { 1.5E-2, 2.629E-1},

  { 1.0E-2, 2.298E-1},
  { 8.0E-3, 2.115E-1},
  { 6.0E-3, 1.883E-1},
  { 5.0E-3, 1.741E-1},
  { 4.0E-3, 1.574E-1},
  { 3.0E-3, 1.372E-1},
  { 2.0E-3, 1.116E-1},
  { 1.5E-3, 9.559E-2},

  { 1.0E-3, 7.601E-2},
  { 8.0E-4, 6.668E-2},
  { 6.0E-4, 5.605E-2},
  { 5.0E-4, 5.008E-2},
  { 4.0E-4, 4.352E-2},
  { 3.0E-4, 3.617E-2},
  { 2.0E-4, 2.768E-2},
  { 1.5E-4, 2.279E-2},

  { 1.0E-4, 1.723E-2},
  { 8.0E-5, 1.473E-2},
  { 6.0E-5, 1.200E-2},
  { 5.0E-5, 1.052E-2},
  { 4.0E-5, 8.950E-3},
  { 3.0E-5, 7.246E-3},
  { 2.0E-5, 5.358E-3},
  { 1.5E-5, 4.313E-3},
  { 0.0, 3.166E-3}
  };

  if (er >= nuca[0][0]) { nloss = nuca[0][1]; }
  else {
    // the table is inverse in energy
    for (G4int i=102; i>=0; --i) {
      G4double edi = nuca[i][0];
      if (er <= edi) {
        G4double edi1 = nuca[i+1][0];
        G4double ai   = nuca[i][1];
        G4double ai1  = nuca[i+1][1];
        nloss = (ai - ai1)*(er - edi1)/(edi - edi1) + ai1;
        break;
      }
    }
  }

  // Stragling
  if(lossFlucFlag) {
    G4double sig = 4.0 * mass1 * mass2 / ((mass1 + mass2)*(mass1 + mass2)*
				    (4.0 + 0.197/(er*er) + 6.584/er));

    nloss *= G4RandGauss::shoot(1.0,sig);
  }
   
  nloss *= 8.462 * z12 * mass1 / rm; // Return to [ev/(10^15 atoms/cm^2]

  nloss = std::max(nloss, 0.0);
  return nloss;
}
int main(){
 G4BraggModel electronic;G4ICRU49NuclearStoppingModel nuclear;
 std::cout<<std::setprecision(17)<<"[\n";bool first=true;
 for(double e:{.5/.6,1.,20.,100.,500.})for(auto target:{std::pair<int,double>{1,2}, {1,3}, {3,6}, {3,7}}){
  if(!first)std::cout<<",\n";first=false;
  auto [z,mass]=target;
  double se=electronic.ElectronicStoppingPower(z,e/2)*1e-22;
  double sn=nuclear.NuclearStoppingPower(e,1,z,2,mass)*1e-22;
  std::cout<<"{\"energyKeV\":"<<e<<",\"z\":"<<z<<",\"massU\":"<<mass
           <<",\"electronicKeVM2\":"<<se<<",\"nuclearKeVM2\":"<<sn<<"}";
 }std::cout<<"\n]\n";
}
