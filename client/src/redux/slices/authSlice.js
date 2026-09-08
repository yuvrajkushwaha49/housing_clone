import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services';

const storedToken = localStorage.getItem('hous_access_token');
const storedUser = localStorage.getItem('hous_user');

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authService.me();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired');
  }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authService.login(payload);
    return data.data;
  } catch (err) {
    const api = err.response?.data;
    return rejectWithValue({
      message: api?.message || 'Login failed',
      code: api?.code,
      email: payload.email,
    });
  }
});

function formatRegisterError(err, email) {
  const api = err.response?.data;
  const fieldErrors = api?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length) {
    return {
      message: fieldErrors.map((e) => `${e.field}: ${e.message}`).join(' · '),
      code: api?.code || 'VALIDATION_ERROR',
      email,
    };
  }
  return {
    message: api?.message || 'Registration failed',
    code: api?.code,
    email,
  };
}

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const body = { ...payload };
    if (!body.phone?.trim()) delete body.phone;
    if (!body.lastName?.trim()) delete body.lastName;
    const { data } = await authService.register(body);
    return data;
  } catch (err) {
    return rejectWithValue(formatRegisterError(err, payload.email));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
    /* ignore network errors on logout */
  }
});

/** Reconcile Redux auth with localStorage after bfcache / back-navigation. */
export const syncAuthFromStorage = createAsyncThunk(
  'auth/syncAuthFromStorage',
  async (_, { dispatch, getState }) => {
    const storedToken = localStorage.getItem('hous_access_token');
    let storedUser = null;
    try {
      const raw = localStorage.getItem('hous_user');
      storedUser = raw ? JSON.parse(raw) : null;
    } catch {
      storedUser = null;
    }

    const { accessToken, user } = getState().auth;
    const sameSession = storedToken === accessToken && storedUser?.id === user?.id;

    if (sameSession) {
      if (storedToken && !getState().auth.initialized) {
        await dispatch(fetchMe());
      }
      return { changed: false };
    }

    if (storedToken && storedUser) {
      dispatch(setCredentials({ accessToken: storedToken, user: storedUser }));
      await dispatch(fetchMe());
      return { changed: true };
    }

    dispatch(clearAuth());
    dispatch(markInitialized());
    return { changed: true };
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    accessToken: storedToken || null,
    status: 'idle',
    error: null,
    initialized: false,
  },
  reducers: {
    setCredentials(state, action) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      localStorage.setItem('hous_access_token', action.payload.accessToken);
      localStorage.setItem('hous_user', JSON.stringify(action.payload.user));
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.error = null;
      localStorage.removeItem('hous_access_token');
      localStorage.removeItem('hous_user');
    },
    clearError(state) {
      state.error = null;
    },
    markInitialized(state) {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.initialized = true;
        localStorage.setItem('hous_access_token', action.payload.accessToken);
        localStorage.setItem('hous_user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.initialized = true;
        localStorage.setItem('hous_user', JSON.stringify(action.payload));
      })
      .addCase(fetchMe.rejected, (state) => {
        state.status = 'failed';
        state.user = null;
        state.accessToken = null;
        state.initialized = true;
        localStorage.removeItem('hous_access_token');
        localStorage.removeItem('hous_user');
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'idle';
        state.initialized = true;
        localStorage.removeItem('hous_access_token');
        localStorage.removeItem('hous_user');
      });
  },
});

export const { setCredentials, clearAuth, clearError, markInitialized } = authSlice.actions;
export default authSlice.reducer;
