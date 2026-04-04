import { corsHeaders } from '@supabase/supabase-js/cors'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { requirement } = await req.json()

    if (!requirement || typeof requirement !== 'string' || requirement.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Invalid requirement. Must be a string under 2000 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
    You are an expert in Photonic Computing and Agentic AI. 
    Build a specialized agent loop for a Photonic Fabric OS based on this requirement: "${requirement}".
    
    The agent must consist of:
    1. Telemetry Nodes (Inputs: thermal, power, network, gpu)
    2. Logic Blocks (Processing: trigger, predictor, guardrail)
    3. Photonic Actuators (Actions: circuit, bypass, reconfigure, alert)
    
    Return ONLY a JSON object with this structure:
    {
      "name": "Short Name",
      "description": "One sentence description",
      "nodes": [
        { "id": "1", "type": "telemetry", "position": { "x": 100, "y": 100 }, "data": { "label": "Label", "type": "thermal|power|network|gpu" } }
      ],
      "edges": [
        { "id": "e1-2", "source": "1", "target": "2", "animated": true, "style": { "stroke": "hsl(142, 100%, 50%)" } }
      ]
    }
    
    Ensure nodes are logically connected and positioned correctly along the X axis (X: 100 -> 350 -> 600).
    Keep it to 3-5 nodes. Use unique numeric IDs for nodes.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text
    const parsed = JSON.parse(jsonStr)

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generate agent error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate agent' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
