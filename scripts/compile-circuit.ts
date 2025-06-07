#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function compileCircuit() {
  // Skip compilation if artifacts already exist
  const outputDir = path.resolve(__dirname, '../circuits/protocol_check_js');
  const finalZkey = path.resolve(__dirname, '../circuits/protocol_check_final.zkey');
  const vKey = path.resolve(__dirname, '../circuits/verification_key.json');
  if (fs.existsSync(finalZkey) && fs.existsSync(vKey) && fs.existsSync(path.join(outputDir, 'protocol_check.wasm'))) {
    console.log('✅ Pre-generated circuit artifacts found. Skipping compilation.');
    return;
  }
  console.log('🔧 Compiling protocol_check circuit...');
  
  const circuitPath = path.resolve(__dirname, '../circuits/protocol_check.circom');
  const ptauPath = path.resolve(__dirname, '../pot12_final.ptau');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Determine which circom binary to use (use local circom2.exe on Windows)
    const circomBinary = process.platform === 'win32'
      ? path.resolve(__dirname, '../circom2.exe')
      : 'npx circom';

    // Step 1: Compile circuit
    console.log('📦 Compiling Circom circuit...');
    execSync(`"${circomBinary}" "${circuitPath}" --r1cs --wasm --sym -o "${outputDir}"`, { 
      stdio: 'inherit' 
    });
    
    // Step 2: Generate proving key
    console.log('🔑 Generating proving key...');
    execSync(`npx snarkjs groth16 setup "${outputDir}/protocol_check.r1cs" "${ptauPath}" "${outputDir}/protocol_check_0000.zkey"`, { 
      stdio: 'inherit' 
    });
    
    // Step 3: Contribute to ceremony (for production, this would be a real ceremony)
    console.log('🎲 Contributing to trusted setup...');
    execSync(`npx snarkjs zkey contribute "${outputDir}/protocol_check_0000.zkey" "${outputDir}/protocol_check_0001.zkey" --name="Initial contribution" -v`, { 
      stdio: 'inherit',
      input: 'random entropy for ceremony\\n' 
    });
    
    // Step 4: Export verification key
    console.log('📤 Exporting verification key...');
    execSync(`npx snarkjs zkey export verificationkey "${outputDir}/protocol_check_0001.zkey" "${outputDir}/verification_key.json"`, { 
      stdio: 'inherit' 
    });
    
    // Step 5: Generate Solidity verifier
    console.log('⛓️ Generating Solidity verifier...');
    execSync(`npx snarkjs zkey export solidityverifier "${outputDir}/protocol_check_0001.zkey" "${outputDir}/verifier.sol"`, { 
      stdio: 'inherit' 
    });

    // Copy final zkey and verification key to root circuits folder for service consumption
    const rootCircuitsDir = path.resolve(__dirname, '../circuits');
    console.log('📋 Copying protocol_check_final.zkey to root circuits folder...');
    fs.copyFileSync(
      path.resolve(outputDir, 'protocol_check_0001.zkey'),
      path.resolve(rootCircuitsDir, 'protocol_check_final.zkey')
    );
    console.log('📋 Copying verification_key.json to root circuits folder...');
    fs.copyFileSync(
      path.resolve(outputDir, 'verification_key.json'),
      path.resolve(rootCircuitsDir, 'verification_key.json')
    );

    console.log('✅ Circuit compilation complete!');
    console.log(`📁 Files generated in: ${outputDir}`);
    console.log('📄 Key files:');
    console.log('  - protocol_check.wasm (circuit binary)');
    console.log('  - protocol_check_0001.zkey (proving key)');
    console.log('  - verification_key.json (verification key)');
    console.log('  - verifier.sol (Solidity verifier)');
    
  } catch (error) {
    console.error('❌ Circuit compilation failed:', error);
    process.exit(1);
  }
}

// Execute compileCircuit when running the script
  compileCircuit().catch(console.error);

export { compileCircuit }; 