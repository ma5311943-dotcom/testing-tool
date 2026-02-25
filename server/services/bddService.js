const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const stripAnsi = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-zARVNvpCWDJTSH]/g, "");
};

exports.runBDDTest = async (testCase) => {
    const { given, when, then, featureContent: customFeatureContent } = testCase;
    const tempDir = path.resolve(__dirname, '../temp_bdd');

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    let finalFeatureContent = "";

    if (customFeatureContent) {
        finalFeatureContent = customFeatureContent;
    } else {
        const finalGiven = given.includes('"') ? given : given.replace(/'/g, '"');
        const finalWhen = when.includes('"') ? when : when.replace(/'/g, '"');
        const finalThen = then.includes('"') ? then : then.replace(/'/g, '"');

        finalFeatureContent = [
            "Feature: Quality Analysis",
            "",
            "  Scenario: Automated Verification",
            `    Given ${finalGiven.startsWith('I am on') ? finalGiven : `"${finalGiven}"`}`,
            `    When ${finalWhen}`,
            `    Then ${finalThen}`,
            ""
        ].join('\n');
    }

    const featureFileName = `run_${Date.now()}.feature`;
    const featurePath = path.join(tempDir, featureFileName);
    fs.writeFileSync(featurePath, finalFeatureContent);

    return new Promise((resolve) => {
        const cwd = path.resolve(__dirname, '..');

        // Use absolute paths for everything to fix Windows pathing issues
        const spawnFeaturePath = path.resolve(featurePath);
        const spawnStepPath = path.resolve(cwd, 'bdd', 'step_definitions.js');

        // Use direct absolute path to cucumber-js.cmd for Windows stability
        // Adding double quotes to handle spaces in path (e.g., "Muhammad Ilyas")
        const cucumberBin = process.platform === 'win32'
            ? `"${path.join(cwd, 'node_modules', '.bin', 'cucumber-js.cmd')}"`
            : path.join(cwd, 'node_modules', '.bin', 'cucumber-js');

        console.log(`[BDD ENGINE] Protocol Spawning: ${cucumberBin}`);

        const cucumber = spawn(cucumberBin, [
            `"${spawnFeaturePath}"`,
            '--require', `"${spawnStepPath}"`,
            '--format', 'summary'
        ], {
            cwd,
            shell: true,
            env: { ...process.env, NODE_ENV: 'test' }
        });

        let output = "";
        let errorOutput = "";

        cucumber.stdout.on('data', (data) => {
            output += data.toString();
        });

        cucumber.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        cucumber.on('close', (code) => {
            if (fs.existsSync(featurePath)) fs.unlinkSync(featurePath);

            const combinedOutput = output + errorOutput;
            const cleanLog = stripAnsi(combinedOutput).trim();

            // Console log for admin monitoring
            console.log(`[BDD ENGINE] Cycle complete. Exit Code: ${code}`);
            if (errorOutput && code !== 0) console.error(`[BDD ENGINE] StdErr Diagnostic: ${errorOutput}`);

            const zeroMatch = cleanLog.match(/0 scenarios/i) || cleanLog.includes('Undefined. Implement with');
            const success = code === 0 && !zeroMatch;

            const resultSummary = [
                "--- BEHAVIORAL INTELLIGENCE REPORT ---",
                `[SYSTEM] : AI Behavior Engine v2.1`,
                `[RESULT] : ${success ? "✅ VALIDATED" : "❌ ANOMALY DETECTED"}`,
                `[REPORT] :`,
                cleanLog || (success ? "All behavioral protocols validated successfully." : "Execution engine encountered a terminal blockage. Check target URL accessibility.")
            ].join('\n');

            resolve({
                success,
                output: resultSummary
            });
        });
    });
};
